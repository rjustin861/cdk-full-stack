import { AnyPrincipal, PolicyStatement } from "@aws-cdk/aws-iam";
import { BlockPublicAccess, Bucket } from "@aws-cdk/aws-s3";
import { BucketDeployment, Source } from "@aws-cdk/aws-s3-deployment";
import { AutoDeleteBucket } from "@mobileposse/auto-delete-bucket";
import * as cdk from "@aws-cdk/core";

export interface S3StackProps extends cdk.StackProps {
  WebsiteIndexDocument: string;
}

export class S3Stack extends cdk.Stack {
  public readonly sourceAssetBucket: Bucket;
  public readonly websiteBucket: Bucket;
  public readonly pipelineArtifactsBucket: Bucket;

  constructor(scope: cdk.Construct, id: string, props: S3StackProps) {
    super(scope, id, props);

    /* S3 Objects */
    //Todo - grant access to cloudfront user and uncomment block all
    //#region
    /* Assets Source Bucket will be used as a codebuild source for the react code */
    this.sourceAssetBucket = new AutoDeleteBucket(this, "SourceAssetBucket", {
      bucketName: `aws-fullstack-template-source-assets-${getRandomInt(
        1000000
      )}`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      versioned: true,
    });

    /* Website Bucket is the target bucket for the react application */
    this.websiteBucket = new AutoDeleteBucket(this, "WebsiteBucket", {
      bucketName: `aws-fullstack-template-website-${getRandomInt(1000000)}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      websiteIndexDocument: props.WebsiteIndexDocument,
      websiteErrorDocument: props.WebsiteIndexDocument,
    });

    /* Pipleine Artifacts Bucket is used by CodePipeline during Builds */
    this.pipelineArtifactsBucket = new AutoDeleteBucket(
      this,
      "PipelineArtifactsBucket",
      {
        bucketName: `aws-fullstack-template-codepipeline-artifacts-${getRandomInt(
          1000000
        )}`,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }
    );

    /* S3 Website Deployment */
    /* Seed the website bucket with the react source */
    const s3WebsiteDeploy = new BucketDeployment(this, "S3WebsiteDeploy", {
      sources: [Source.asset("./assets/archive")],
      destinationBucket: this.sourceAssetBucket,
    });

    /* Set Website Bucket Allow Policy */
    this.websiteBucket.addToResourcePolicy(
      new PolicyStatement({
        resources: [`${this.websiteBucket.bucketArn}/*`],
        actions: ["s3:Get*"],
        principals: [new AnyPrincipal()],
      })
    );
    //#endregion
  }
}

const getRandomInt = (max: number) => {
  return Math.floor(Math.random() * Math.floor(max));
};
