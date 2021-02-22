import * as cdk from '@aws-cdk/core';
import {
  Effect,
  Policy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from '@aws-cdk/aws-iam';
import { AttributeType, Table } from '@aws-cdk/aws-dynamodb';

export interface DatabaseStackProps extends cdk.StackProps {
  ProjectName: string;
  TableName: string;
}

export class DatabaseStack extends cdk.Stack {
  public readonly goalsTable: Table;
  public readonly dynamoDbRole: Role;

  constructor(scope: cdk.Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    /* Dynamo Objects */
    //#region
    /* Create DynamoDB Goals Table */
    this.goalsTable = new Table(this, 'TGoals', {
      tableName: `${props.ProjectName}-${props.TableName}`,
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      sortKey: { name: 'goalId', type: AttributeType.STRING },
      readCapacity: 1,
      writeCapacity: 1,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    /* Create DynamoDB Role/Policy */
    this.dynamoDbRole = new Role(this, 'DynamoDbRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    const goalsPolicy = new Policy(this, 'GoalsPolicy', {
      policyName: 'GoalsPolicy',
      roles: [this.dynamoDbRole],
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['dynamodb:*'],
          resources: [this.goalsTable.tableArn],
        }),
      ],
    });

    //#endregion
  }
}
