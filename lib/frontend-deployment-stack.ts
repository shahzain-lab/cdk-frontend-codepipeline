import * as cdk from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import * as CodePipelineAction from 'aws-cdk-lib/aws-codepipeline-actions';
import * as CodePipeline from 'aws-cdk-lib/aws-codepipeline';
import * as CodeBuild from 'aws-cdk-lib/aws-codebuild';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

export class FrontendDeploymentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const frontendBucket = new Bucket(this, 'frontend-deployment', {
      versioned: true,
      websiteIndexDocument: 'index.html'
    })


    const distribution = new Distribution(this, 'frontend-distribution', {
      defaultBehavior: { origin: new S3Origin(frontendBucket) }
    })

    new BucketDeployment(this, 'frontend-bucket_deployment', {
      sources: [Source.asset('./../frontend-deployment/dist')],
      destinationBucket: frontendBucket,
      distribution: distribution
    })

    new cdk.CfnOutput(this, "CloudFrontURL", {
      value: distribution.domainName
    });

    // Artifact from source stage
    const sourceOutput = new CodePipeline.Artifact();

    // Artifact from build stage
    const S3Output = new CodePipeline.Artifact();
  
    const s3Build = new CodeBuild.PipelineProject(this, 'frontend-codebuild-pipeline', {
      buildSpec: CodeBuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            "runtime-versions": {
              "nodejs": 16
            },
            commands: [
              'n 18',
              'npm install',
            ],
          },
          build: {
            commands: [
              'npm run build',
            ],
          }
        },
        artifacts: {
          'base-directory': './dist',  
          "files": [
            '**/*'
          ]
        },
      }),
      environment: {
        buildImage: CodeBuild.LinuxBuildImage.STANDARD_6_0,  
      },
    })

    const policy = new PolicyStatement();
    policy.addActions('s3:*');
    policy.addResources('*');

    s3Build.addToRolePolicy(policy);

    const pipeline = new CodePipeline.Pipeline(this, 'frontend-pipeline', {
      crossAccountKeys: false, 
    });

        //First Stage Source
        pipeline.addStage({
          stageName: 'Source',
          actions: [
            new CodePipelineAction.GitHubSourceAction({
              actionName: 'Checkout',
              owner: 'shahzain-lab',
              repo: "cdk-frontend-deployment",
              oauthToken: cdk.SecretValue.secretsManager('github-token'), 
              output: sourceOutput,                                       
              branch: "main",                                           
            }),
          ],
        })
    
        pipeline.addStage({
          stageName: 'Build',
          actions: [
            new CodePipelineAction.CodeBuildAction({
              actionName: 's3Build',
              project: s3Build,
              input: sourceOutput,
              outputs: [S3Output],
            }),
          ],
        })
    
        pipeline.addStage({
          stageName: 'Deploy',
          actions: [
            new CodePipelineAction.S3DeployAction({
              actionName: 's3Build',
              input: S3Output,
              bucket: frontendBucket,
            }),
          ],
        })
  }
}
