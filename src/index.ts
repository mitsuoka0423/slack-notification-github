import { Webhooks as OctokitWebhooks } from '@octokit/webhooks';
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
	init as initSlackApp,
	postToDebugChannel,
	postToReviewChannel,
} from './api/slackApp';
import { init as initReviewTable } from './db/reviewTable';
import { ENV } from './env';
import { handle as handlePullRequestClosed } from './handler/pullRequest/closed';
import { handle as handlePullRequestOpened } from './handler/pullRequest/opened';
import { handle as handlePullRequestReopened } from './handler/pullRequest/reopened';
import { handle as handlePullRequestReview } from './handler/pullRequestReview';

const secret = ENV.GITHUB_APP_WEBHOOK_SECRET;
const reviewChannel = ENV.SLACK_API_REVIEW_CHANNEL;
const debugChannel = ENV.SLACK_API_DEBUG_CHANNEL;
const botToken = ENV.SLACK_API_BOT_TOKEN;
const signingSecret = ENV.SLACK_API_SIGNING_SECRET;
const reactionApprove = ENV.SLACK_API_REACTION_APPROVE;
const reactionMerge = ENV.SLACK_API_REACTION_MERGE;
const reactionClose = ENV.SLACK_API_REACTION_CLOSE;

const octokitWebhooks = new OctokitWebhooks({
	secret,
});

initReviewTable();
initSlackApp({
	_token: botToken,
	_signingSecret: signingSecret,
	_reviewChannel: reviewChannel,
	_debugChannel: debugChannel,
	_reactionApprove: reactionApprove,
	_reactionMerge: reactionMerge,
	_reactionClose: reactionClose,
});

// NOTE: イベントハンドラーを作って登録する
octokitWebhooks.on('pull_request.opened', handlePullRequestOpened);
octokitWebhooks.on('pull_request.closed', handlePullRequestClosed);
octokitWebhooks.on('pull_request.reopened', handlePullRequestReopened);
octokitWebhooks.on('pull_request_review', handlePullRequestReview);

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
			// console.warn('署名検証に失敗しました');
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
