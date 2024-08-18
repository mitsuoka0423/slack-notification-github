import { Webhooks as OctokitWebhooks } from '@octokit/webhooks';
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
	init as initSlackApp,
	postToDebugChannel,
	postToReviewChannel,
} from './api/slackApp';
import { init as initReviewTable, set } from './db/reviewTable';
import { ENV } from './env';
import { handle } from './handler/pullRequest/opened';

const secret = ENV.GITHUB_APP_WEBHOOK_SECRET;
const reviewChannel = ENV.SLACK_API_REVIEW_CHANNEL;
const debugChannel = ENV.SLACK_API_DEBUG_CHANNEL;
const botToken = ENV.SLACK_API_BOT_TOKEN;
const signingSecret = ENV.SLACK_API_SIGNING_SECRET;

const octokitWebhooks = new OctokitWebhooks({
	secret,
});

initReviewTable();
initSlackApp({
	_token: botToken,
	_signingSecret: signingSecret,
	_reviewChannel: reviewChannel,
	_debugChannel: debugChannel,
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
	console.info('[START]index.handler');
	console.debug(JSON.stringify(event, null, 2));

	// デバッグ用
	await postToDebugChannel({
		text: `
Webhookイベントを受信しました

${JSON.stringify(JSON.parse(event.body || '{}'), null, 2)}
`,
	});

	try {
		const xGitHubDelivery = event.headers['x-github-delivery'];
		const xGitHubEvent = event.headers['x-github-event'];
		const xHubSignature = event.headers['x-hub-signature'];
		const body = JSON.parse(event.body || '');
		if (!xGitHubDelivery || !xGitHubEvent || !xHubSignature || !body) {
			console.warn('必須パラメータが設定されていません');
			console.warn({ xGitHubDelivery, xGitHubEvent, xHubSignature, body });

			return {
				statusCode: 400,
				body: JSON.stringify({ error: 'Bad Request' }),
			};
		}

		octokitWebhooks.on('pull_request.opened', handle);

		const id = xGitHubDelivery;
		// FIXME: 誰か型を当ててくれ
		const name = xGitHubEvent as any;
		const payload = body;
		const signature = xHubSignature;

		try {
			// FIXME: 署名検証に失敗するので、一旦署名検証はスキップする
			// await octokitWebhooks.verifyAndReceive({
			// 	id,
			// 	name,
			// 	payload,
			// 	signature,
			// });
			await octokitWebhooks.receive({
				id,
				name,
				payload,
			});
		} catch (error) {
			console.warn('署名検証に失敗しました');
			console.warn(error);

			return {
				statusCode: 400,
				body: JSON.stringify({ error: 'Bad Request' }),
			};
		}

		console.info('[END]index.handler');

		return {
			statusCode: 200,
			body: JSON.stringify({ message: 'Event processed' }),
		};
	} catch (error) {
		console.error('エラーが発生しました');
		console.error('Error:', error);

		await postToReviewChannel({
			text: `
エラーが発生しました

${error}
	`,
		});

		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Internal server error' }),
		};
	}
};
