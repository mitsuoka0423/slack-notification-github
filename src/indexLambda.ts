import fs from 'node:fs';
import type { APIGatewayProxyHandler } from 'aws-lambda';
import { App as OctokitApp } from '@octokit/app';
import { App as SlackApp } from '@slack/bolt';

const appId = process.env.GITHUB_APP_ID || '';
const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH || '';
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const secret = process.env.GITHUB_APP_WEBHOOK_SECRET || '';

// GitHub Appの設定
const app = new OctokitApp({
	appId,
	privateKey,
	webhooks: {
		secret,
	},
});

const slackApp = new SlackApp({
	token: process.env.SLACK_API_BOT_TOKEN || '',
	signingSecret: process.env.SLACK_API_SIGNING_SECRET || '',
});

export const handler: APIGatewayProxyHandler = async (event) => {
	console.debug(JSON.stringify(event, null, 2));

	try {
		const payload = JSON.parse(event.body || '{}');
		console.debug(JSON.stringify(payload, null, 2));

		const response = await slackApp.client.chat.postMessage({
			channel: process.env.SLACK_API_REVIEW_CHANNEL || '',
			text: `
@{メンション}
レビューお願いします！
	`,
		});

		await slackApp.client.chat.postMessage({
			channel: process.env.SLACK_API_DEBUG_CHANNEL || '',
			text: `
Webhookイベントを受信しました

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
