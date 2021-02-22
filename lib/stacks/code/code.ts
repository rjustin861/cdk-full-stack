import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import { CognitoStack } from '../cognito/cognito';
import { S3Stack } from '../s3/s3';
import { ApiGatewayStack } from '../apigateway/apigateway';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipelineactions from '@aws-cdk/aws-codepipeline-actions';

export interface CodeStackProps extends cdk.StackProps {
  ProjectName: String;
}

export class CodeStack extends cdk.Stack {
  constructor(
    scope: cdk.Construct,
    id: string,
    cognitoStack: CognitoStack,
    s3Stack: S3Stack,
    apigatewayStack: ApiGatewayStack,
    props: CodeStackProps
  ) {
    super(scope, id, props);

    /* CodeBuild Roles/Policies */
    //#region
    const codeBuildRole = new iam.Role(this, 'CodeBuildRole', {
      roleName: 'CodeBuildRole',
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
    });

    codeBuildRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:*'],
        resources: [
          s3Stack.sourceAssetBucket.bucketArn,
          s3Stack.pipelineArtifactsBucket.bucketArn,
          s3Stack.websiteBucket.bucketArn,
          `${s3Stack.websiteBucket.bucketArn}/*`,
        ],
      })
    );

    codeBuildRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'logs:CreateLogGroup',
          'cloudfront:CreateInvalidation',
        ],
        resources: ['*'],
      })
    );

    const codePipelineRole = new iam.Role(this, 'CodePipelineRole', {
      roleName: 'CodePipelineRole',
      assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com'),
    });

    codePipelineRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:*'],
        resources: [
          s3Stack.sourceAssetBucket.bucketArn,
          s3Stack.pipelineArtifactsBucket.bucketArn,
          s3Stack.websiteBucket.bucketArn,
          `${s3Stack.websiteBucket.bucketArn}/*`,
        ],
      })
    );

    //#endregion

    /* CodeBuild Pipeline Project */
    //#region
    const codeBuildProject = new codebuild.PipelineProject(
      this,
      'CodeBuildProject',
      {
        projectName: `${props.ProjectName}-build`,
        description: `CodeBuild Project for ${props.ProjectName}.`,
        environment: {
          computeType: codebuild.ComputeType.SMALL,
          buildImage: codebuild.LinuxBuildImage.STANDARD_3_0,
          environmentVariables: {
            API_GATEWAY_REGION: { value: cdk.Aws.REGION },
            API_GATEWAY_URL: { value: apigatewayStack.appApi.url.slice(0, -1) },
            COGNITO_REGION: { value: cdk.Aws.REGION },
            COGNITO_USER_POOL_ID: { value: cognitoStack.userPool.userPoolId },
            COGNITO_APP_CLIENT_ID: {
              value: cognitoStack.userPoolClient.userPoolClientId,
            },
            COGNITO_IDENTITY_POOL_ID: { value: cognitoStack.identityPool.ref },
            WEBSITE_BUCKET: { value: s3Stack.websiteBucket.bucketName },
          },
        },
        role: codeBuildRole,
        buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
        timeout: cdk.Duration.minutes(5),
      }
    );
    cdk.Tag.add(codeBuildProject, 'app-name', `${props.ProjectName}`);

    codePipelineRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['codebuild:BatchGetBuilds', 'codebuild:StartBuild'],
        resources: [codeBuildProject.projectArn],
      })
    );

    //#endregion

    /* Code Pipeline Object */
    //#region
    const sourceOutput = new codepipeline.Artifact(
      `${props.ProjectName}-SourceArtifact`
    );
    const buildOutput = new codepipeline.Artifact(
      `${props.ProjectName}-BuildArtifact`
    );

    const codePipeline = new codepipeline.Pipeline(this, 'AssetsCodePipeline', {
      pipelineName: `${props.ProjectName}-Assets-Pipeline`,
      role: codePipelineRole,
      artifactBucket: s3Stack.pipelineArtifactsBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipelineactions.S3SourceAction({
              actionName: 's3Source',
              bucket: s3Stack.sourceAssetBucket,
              bucketKey: 'assets.zip',
              output: sourceOutput,
              //trigger: codepipelineactions.S3Trigger.POLL
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipelineactions.CodeBuildAction({
              actionName: 'build-and-deploy',
              project: codeBuildProject,
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
      ],
    });
    //#endregion
  }
}
