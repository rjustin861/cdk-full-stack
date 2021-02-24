import {
  CloudFrontWebDistribution,
  OriginAccessIdentity,
} from "@aws-cdk/aws-cloudfront";
import { Bucket } from "@aws-cdk/aws-s3";
import * as cdk from "@aws-cdk/core";
import { CfnOutput } from "@aws-cdk/core";

export interface CdnStackProps extends cdk.StackProps {
  cdnWebsiteIndexDocument: string;
  websiteBucket: Bucket;
}

export class CdnStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: CdnStackProps) {
    super(scope, id, props);

    /* Cloudfront CDN Distribution */
    //#region

    const assetsCdn = new CloudFrontWebDistribution(this, "AssetsCDN", {
      defaultRootObject: props.cdnWebsiteIndexDocument,
      comment: `CDN for ${props.websiteBucket}`,
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: props.websiteBucket,
            // originAccessIdentity: new OriginAccessIdentity(
            //   this,
            //   'WebsiteBucketOriginAccessIdentity',
            //   {
            //     comment: `OriginAccessIdentity for ${props.websiteBucket}`,
            //   }
            // ),
          },
          behaviors: [{ isDefaultBehavior: true }],
        },
      ],
    });

    //#endregion
    new CfnOutput(this, "CloudFrontCDNUrl", {
      value: `http://${assetsCdn.distributionDomainName}`,
    });
  }
}
