import * as cdk from "@aws-cdk/core";

export class DeploymentStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);
  }
}
