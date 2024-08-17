// import fs from 'node:fs';
// import { App as OctokitApp } from '@octokit/app';
import { App as SlackApp } from '@slack/bolt';
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { init, set } from './reviewTable';

// const appId = process.env.GITHUB_APP_ID || '';
// const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH || '';
// const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
// const secret = process.env.GITHUB_APP_WEBHOOK_SECRET || '';
const reviewChannel = process.env.SLACK_API_REVIEW_CHANNEL || '';

// GitHub Appの設定
// const app = new OctokitApp({
// 	appId,
// 	privateKey,
// 	webhooks: {
// 		secret,
// 	},
// });

const slackApp = new SlackApp({
	token: process.env.SLACK_API_BOT_TOKEN || '',
	signingSecret: process.env.SLACK_API_SIGNING_SECRET || '',
});

init();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
	console.debug(JSON.stringify(event, null, 2));

	try {
		const payload = JSON.parse(event.body || '{}');
		console.debug(JSON.stringify(payload, null, 2));

		// FIXME: 誰か型を当ててくれ
		if (payload.action === 'opened') {
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

				set({
					prUrl: payload.pull_request.html_url,
					updatedAt: payload.pull_request.updated_at,
					slackThread: {
						channelId: channel,
						ts,
					},
				});
			}
		}

		const prNumer = payload.number;
		// デバッグ用
		await slackApp.client.chat.postMessage({
			channel: process.env.SLACK_API_DEBUG_CHANNEL || '',
			text: `
Webhookイベントを受信しました

PR #${prNumer}

${JSON.stringify(payload, null, 2)}
	`,
		});

		return {
			statusCode: 200,
			body: JSON.stringify({ message: 'Event processed' }),
		};
	} catch (error) {
		console.error('Error:', error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Internal server error' }),
		};
	}
};
