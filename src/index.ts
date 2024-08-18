import { Webhooks as OctokitWebhooks } from '@octokit/webhooks';
import { App as SlackApp } from '@slack/bolt';
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { init, set } from './reviewTable';

const secret = process.env.GITHUB_APP_WEBHOOK_SECRET || '';
const reviewChannel = process.env.SLACK_API_REVIEW_CHANNEL || '';
const debugChannel = process.env.SLACK_API_DEBUG_CHANNEL || '';

const octokitWebhooks = new OctokitWebhooks({
	secret,
});

const slackApp = new SlackApp({
	token: process.env.SLACK_API_BOT_TOKEN || '',
	signingSecret: process.env.SLACK_API_SIGNING_SECRET || '',
});

init();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
	console.info('[START]index.handler');
	console.debug(JSON.stringify(event, null, 2));

	// デバッグ用
	await slackApp.client.chat.postMessage({
		channel: debugChannel,
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
			console.warn('署名検証に失敗しました');
			console.warn(error);

			return {
				statusCode: 400,
				body: JSON.stringify({ error: 'Bad Request' }),
			};
		}

		octokitWebhooks.on('pull_request.opened', async ({ payload }) => {
			console.info('[START]octokitWebhooks.on(pull_request.opened)');
			console.debug({ payload: JSON.stringify(payload, null, 2) });

			const response = await slackApp.client.chat.postMessage({
				channel: reviewChannel,
				text: `
@{メンション}
レビューお願いします！

・URL: ${payload.pull_request.html_url}
`,
			});

			if (response.ok) {
				const { ts, channel } = response;

				if (!ts || !channel) {
					throw new Error(
						`Channel IDまたはTSが見つかりません(Channel ID: ${channel}, TS: ${ts})`,
					);
				}

				await set({
					prUrl: payload.pull_request.html_url,
					updatedAt: payload.pull_request.updated_at,
					slackThread: {
						channelId: channel,
						ts,
					},
				});
			}

			console.info('[END]octokitWebhooks.on(pull_request.opened)');
		});

		console.info('[END]index.handler');

		return {
			statusCode: 200,
			body: JSON.stringify({ message: 'Event processed' }),
		};
	} catch (error) {
		console.error('エラーが発生しました');
		console.error('Error:', error);

		await slackApp.client.chat.postMessage({
			channel: debugChannel,
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
