#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import * as ssm from "@aws-cdk/aws-ssm";
import { DatabaseStack } from "../lib/stacks/database/database";
import { S3Stack } from "../lib/stacks/s3/s3";
import { CdnStack } from "../lib/stacks/cdn/cdn";
import { LambdaStack } from "../lib/stacks/lambda/lambda";
import { CognitoStack } from "../lib/stacks/cognito/cognito";
import { ApiGatewayStack } from "../lib/stacks/apigateway/apigateway";
import { CodeStack } from "../lib/stacks/code/code";
import { SsmSeederStack } from "../lib/stacks/ssmseeder/ssmseeder";
import { DeploymentStack } from "../lib/deployment/deployment";

const app = new cdk.App();

let projectName: string = app.node.tryGetContext("projectname") || "MyCDKGoals";
const envList: string[] = ["Dev-local", "Dev-integration"];

if (projectName.length > 12)
  throw new Error("Project name must be 12 characters or less");

//SSM Parameter Seeder Stack
new SsmSeederStack(app, "SsmSeederStack");

//Deployment Container Stack
const deploymentStack = new DeploymentStack(app, "DeploymentStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

//Get the appropriate env from context or from SSM
let bizEnv =
  app.node.tryGetContext("env") ||
  ssm.StringParameter.valueFromLookup(deploymentStack, "/CdkEnvs/Default-env");

if (!envList.includes(bizEnv))
  throw new Error(`Allowable env values are ${envList}`);

const envProps = {
  useCdn: true,
};

const projProps = {
  projectName,
};

/* Api Gateway Properties */
const apiProps = {
  apiName: `${projectName}-`.concat(
    ssm.StringParameter.valueFromLookup(
      deploymentStack,
      `/CdkEnvs/${bizEnv}/apiName`
    )
  ),
  authorizorName: `${projectName}-`.concat(
    ssm.StringParameter.valueFromLookup(
      deploymentStack,
      `/CdkEnvs/${bizEnv}/authorizorName`
    )
  ),
};

/* Cdn Properties */
const cdnProps = {
  cdnComment: `${projectName}-`.concat(
    ssm.StringParameter.valueFromLookup(
      deploymentStack,
      `/CdkEnvs/${bizEnv}/cdnComment`
    )
  ),
  cdnWebsiteIndexDocument: ssm.StringParameter.valueFromLookup(
    deploymentStack,
    `/CdkEnvs/${bizEnv}/cdnWebsiteIndexDocument`
  ),
};

/* CodeBuild/Pipeline Properties */
const codeProps = {
  codeBuildRoleName: `${projectName}-`.concat(
    ssm.StringParameter.valueFromLookup(
      deploymentStack,
      `/CdkEnvs/${bizEnv}/codeBuildRoleName`
    )
  ),
  codePipelineRoleName: `${projectName}-`.concat(
    ssm.StringParameter.valueFromLookup(
      deploymentStack,
      `/CdkEnvs/${bizEnv}/codePipelineRoleName`
    )
  ),
  pipelineProjectName: `${projectName}-`.concat(
    ssm.StringParameter.valueFromLookup(
      deploymentStack,
      `/CdkEnvs/${bizEnv}/pipelineProjectName`
    )
  ),
  pipelineProjectDescription: `${projectName}-`.concat(
    ssm.StringParameter.valueFromLookup(
      deploymentStack,
      `/CdkEnvs/${bizEnv}/pipelineProjectDescription`
    )
  ),
  pipelineProjectBuildSpec: ssm.StringParameter.valueFromLookup(
    deploymentStack,
    `/CdkEnvs/${bizEnv}/pipelineProjectBuildSpec`
  ),
};

/* Cognito Properties */
const cognitoProps = {
  userPoolName: `${projectName}-`.concat(
    ssm.StringParameter.valueFromLookup(
      deploymentStack,
      `/CdkEnvs/${bizEnv}/userPoolName`
    )
  ),
  userPoolClientName: `${projectName}-`.concat(
    ssm.StringParameter.valueFromLookup(
      deploymentStack,
      `/CdkEnvs/${bizEnv}/userPoolClientName`
    )
  ),
  identityPoolName: `${projectName}-`.concat(
    ssm.StringParameter.valueFromLookup(
      deploymentStack,
      `/CdkEnvs/${bizEnv}/identityPoolName`
    )
  ),
};

/* DynamoDb Properties */
const dbProps = {
  tableName: `${projectName}-`.concat(
    ssm.StringParameter.valueFromLookup(
      deploymentStack,
      `/CdkEnvs/${bizEnv}/tableName`
    )
  ),
  partitionKeyName: ssm.StringParameter.valueFromLookup(
    deploymentStack,
    `/CdkEnvs/${bizEnv}/partitionKeyName`
  ),
  sortKeyName: ssm.StringParameter.valueFromLookup(
    deploymentStack,
    `/CdkEnvs/${bizEnv}/sortKeyName`
  ),
};

/* Lambda Properties */
const lambdaProps = {};

/* S3 Properties */
const s3Props = {
  s3WebsiteDeploySource: ssm.StringParameter.valueFromLookup(
    deploymentStack,
    `/CdkEnvs/${bizEnv}/s3WebsiteDeploySource`
  ),
  websiteIndexDocument: ssm.StringParameter.valueFromLookup(
    deploymentStack,
    `/CdkEnvs/${bizEnv}/websiteIndexDocument`
  ),
  websiteErrorDocument: ssm.StringParameter.valueFromLookup(
    deploymentStack,
    `/CdkEnvs/${bizEnv}/websiteErrorDocument`
  ),
};

/* Full Application Properties */
const props = {
  ...envProps,
  ...projProps,
  ...apiProps,
  ...cdnProps,
  ...codeProps,
  ...cognitoProps,
  ...dbProps,
  ...lambdaProps,
  ...s3Props,
};

/* Uncomment if you are having issues with property params */
console.log(props);

// const props = {
//   ProjectName: "MyCDKGoals",
//   TableName: "CDKGoals",
//   WebsiteIndexDocument: "index.html",
//   CdnWebsiteIndexDocument: "index.html",
//   useCdn: true,
// };

cdk.Tags.of(app).add("App", "CDKFullStack");

const databaseStack = new DatabaseStack(app, "DatabaseStack", props);

const s3Stack = new S3Stack(app, "S3Stack", props);

if (props.useCdn) {
  const cdnStack = new CdnStack(app, "CdnStack", {
    ...props,
    websiteBucket: s3Stack.websiteBucket,
  });
}

const lambdaStack = new LambdaStack(
  app,
  "LambdaStack",
  databaseStack.goalsTable,
  databaseStack.dynamoDbRole,
  props
);

const cognitoStack = new CognitoStack(app, "CognitoStack", props);

const apiGatewayStack = new ApiGatewayStack(
  app,
  "ApiGatewayStack",
  lambdaStack,
  cognitoStack,
  props
);

const codeStack = new CodeStack(
  app,
  "CodeStack",
  cognitoStack,
  s3Stack,
  apiGatewayStack,
  props
);
