import {
  AuthorizationType,
  CfnAuthorizer,
  IResource,
  LambdaIntegration,
  MockIntegration,
  PassthroughBehavior,
  RestApi,
} from "@aws-cdk/aws-apigateway";
import * as cdk from "@aws-cdk/core";
import { CognitoStack } from "../cognito/cognito";
import { LambdaStack } from "../lambda/lambda";

export interface ApiGatewayStackProps extends cdk.StackProps {
  projectName: string;
}

export class ApiGatewayStack extends cdk.Stack {
  public readonly appApi: RestApi;

  constructor(
    scope: cdk.Construct,
    id: string,
    lambdaStack: LambdaStack,
    cognitoStack: CognitoStack,
    props: ApiGatewayStackProps
  ) {
    super(scope, id, props);

    /* Api Gateway */
    //#region
    this.appApi = new RestApi(this, "AppApi", {
      restApiName: props.projectName,
    });

    const authorizer = new CfnAuthorizer(this, "ApiAuthorizer", {
      restApiId: this.appApi.restApiId,
      name: "ApiAuthorizer",
      type: "COGNITO_USER_POOLS",
      identitySource: "method.request.header.Authorization",
      providerArns: [cognitoStack.userPool.userPoolArn],
    });

    this.appApi.root.addMethod("ANY");

    const items = this.appApi.root.addResource("goals");
    const getAllIntegration = new LambdaIntegration(
      lambdaStack.functionListGoals
    );
    items.addMethod("GET", getAllIntegration, {
      authorizationType: AuthorizationType.IAM,
      authorizer: { authorizerId: authorizer.ref },
    });

    const createOneIntegration = new LambdaIntegration(
      lambdaStack.functionCreateGoal
    );
    items.addMethod("POST", createOneIntegration, {
      authorizationType: AuthorizationType.IAM,
      authorizer: { authorizerId: authorizer.ref },
    });
    addCorsOptions(items);

    const singleItem = items.addResource("{id}");
    const getOneIntegration = new LambdaIntegration(
      lambdaStack.functionGetGoal
    );
    singleItem.addMethod("GET", getOneIntegration, {
      authorizationType: AuthorizationType.IAM,
      authorizer: { authorizerId: authorizer.ref },
    });

    const updateOneIntegration = new LambdaIntegration(
      lambdaStack.functionUpdateGoal
    );
    singleItem.addMethod("PUT", updateOneIntegration, {
      authorizationType: AuthorizationType.IAM,
      authorizer: { authorizerId: authorizer.ref },
    });

    const deleteOneIntegration = new LambdaIntegration(
      lambdaStack.functionDeleteGoal
    );
    singleItem.addMethod("DELETE", deleteOneIntegration, {
      authorizationType: AuthorizationType.IAM,
      authorizer: { authorizerId: authorizer.ref },
    });
    addCorsOptions(singleItem);

    //#endregion
  }
}

export function addCorsOptions(apiResource: IResource) {
  apiResource.addMethod(
    "OPTIONS",
    new MockIntegration({
      integrationResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Headers":
              "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
            "method.response.header.Access-Control-Allow-Origin": "'*'",
            "method.response.header.Access-Control-Allow-Credentials":
              "'false'",
            "method.response.header.Access-Control-Allow-Methods":
              "'OPTIONS,GET,PUT,POST,DELETE'",
          },
        },
      ],
      passthroughBehavior: PassthroughBehavior.NEVER,
      requestTemplates: {
        "application/json": '{"statusCode": 200}',
      },
    }),
    {
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Headers": true,
            "method.response.header.Access-Control-Allow-Methods": true,
            "method.response.header.Access-Control-Allow-Credentials": true,
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
      ],
    }
  );
}
