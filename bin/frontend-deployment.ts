#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FrontendDeploymentStack } from '../lib/frontend-deployment-stack';

const createStacks = async () => {
  try{
      const app = new cdk.App();
      const stackProps: cdk.StackProps = {
          stackName: `frontend-deployment`,  
      } 
      new FrontendDeploymentStack(app, `frontend-deployment-stack`, stackProps)
  }catch(err){
      console.log(err)
  }
}

createStacks()