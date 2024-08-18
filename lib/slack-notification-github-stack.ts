import { Duration, Stack, type StackProps } from 'aws-cdk-lib';
import { Architecture, FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import type { Construct } from 'constructs';

export class SlackNotificationGitHubStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		const lambda = new NodejsFunction(this, 'main', {
			functionName: 'slack-notification-github-cdk',
			entry: './src/index.ts',
			handler: 'handler',
			architecture: Architecture.ARM_64,
			timeout: Duration.seconds(10),
		});
		const url = lambda.addFunctionUrl({
			authType: FunctionUrlAuthType.NONE,
		});
	}
}
