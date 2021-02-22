#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { DatabaseStack } from '../lib/stacks/database/database';
import { S3Stack } from '../lib/stacks/s3/s3';
import { CdnStack } from '../lib/stacks/cdn/cdn';
import { LambdaStack } from '../lib/stacks/lambda/lambda';
import { CognitoStack } from '../lib/stacks/cognito/cognito';
import { ApiGatewayStack } from '../lib/stacks/apigateway/apigateway';
import { CodeStack } from '../lib/stacks/code/code';

const app = new cdk.App();

const props = {
  ProjectName: 'MyCDKGoals',
  TableName: 'CDKGoals',
  WebsiteIndexDocument: 'index.html',
  CdnWebsiteIndexDocument: 'index.html',
  useCdn: true,
};

cdk.Tags.of(app).add('App', 'CDKFullStack');

const databaseStack = new DatabaseStack(app, 'DatabaseStack', props);

const s3Stack = new S3Stack(app, 'S3Stack', props);

if (props.useCdn) {
  const cdnStack = new CdnStack(app, 'CdnStack', {
    ...props,
    websiteBucket: s3Stack.websiteBucket,
  });
}

const lambdaStack = new LambdaStack(
  app,
  'LambdaStack',
  databaseStack.goalsTable,
  databaseStack.dynamoDbRole,
  props
);

const cognitoStack = new CognitoStack(app, 'CognitoStack', props);

const apiGatewayStack = new ApiGatewayStack(
  app,
  'ApiGatewayStack',
  lambdaStack,
  cognitoStack,
  props
);

const codeStack = new CodeStack(
  app,
  'CodeStack',
  cognitoStack,
  s3Stack,
  apiGatewayStack,
  props
);
