import fs from 'node:fs';
import http from 'node:http';
import { App as OctokitApp } from '@octokit/app';
import { createNodeMiddleware } from '@octokit/webhooks';
import { App as SlackApp } from '@slack/bolt';
import { config } from 'dotenv';
import { init, set, get } from './kvs';

type ThreadInfo = {
	ts: string;
	channel: string;
};

config({ path: '.env.dev' });

const appId = process.env.GITHUB_APP_ID || '';
const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH || '';
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const secret = process.env.GITHUB_APP_WEBHOOK_SECRET || '';
// NOTE: GHESを利用する場合は設定する
// const enterpriseHostname = process.env.ENTERPRISE_HOSTNAME;

const octokitApp = new OctokitApp({
	appId,
	privateKey,
	webhooks: {
		secret,
	},
	// NOTE: GHESを利用する場合は設定する
	// ...(enterpriseHostname && {
	// 	Octokit: Octokit.defaults({
	// 		baseUrl: `https://${enterpriseHostname}/api/v3`,
	// 	}),
	// }),
});

const slackApp = new SlackApp({
	token: process.env.SLACK_API_BOT_TOKEN || '',
	signingSecret: process.env.SLACK_API_SIGNING_SECRET || '',
});

init();

const { data } = await octokitApp.octokit.request('/app');

octokitApp.octokit.log.debug(`Authenticated as '${data.name}'`);

octokitApp.webhooks.on('pull_request.opened', async ({ octokit, payload }) => {
	console.log(
		`Received a pull request event for #${payload.pull_request.number}`,
	);
	console.log(JSON.stringify(payload, null, 2));
	const response = await slackApp.client.chat.postMessage({
		// TODO: .envに移動
		channel: process.env.SLACK_API_TARGET_CHANNEL || '',
		// TODO: ユーザーごとに出し分け
		text: `
<@U07GUPMT4E5> <@レビュアー>
レビューお願いします！

- PR
  - タイトル: ${payload.pull_request.title}
  - URL: ${payload.pull_request.url}
- 初回レビュー希望日: 
- 依頼者: @{アサイニー}
`,
	});

	if (response.ok) {
		const { ts, channel } = response;
		console.debug({ ts, channel });

		const { id } = payload.pull_request;

		set(String(id), JSON.stringify({ ts, channel }));
	}
});

octokitApp.webhooks.on(
	'pull_request.reopened',
	async ({ octokit, payload }) => {
		console.log(
			`Received a pull request event for #${payload.pull_request.number}`,
		);
		console.log(JSON.stringify(payload, null, 2));

		const { id } = payload.pull_request;

		const threadInfo = get<ThreadInfo>(String(id));
		console.log({ ts: threadInfo.ts, channel: threadInfo.channel });

		await slackApp.client.chat.postMessage({
			// TODO: .envに移動
			channel: process.env.SLACK_API_TARGET_CHANNEL || '',
			// TODO: ユーザーごとに出し分け
			text: `
<@U07GUPMT4E5> <@レビュアー>
PRが再オープンされました

- PR
  - タイトル: ${payload.pull_request.title}
  - URL: ${payload.pull_request.url}
`,
		});
	},
);

octokitApp.webhooks.onError((error) => {
	if (error.name === 'AggregateError') {
		console.log(`Error processing request: ${error.event}`);
	} else {
		console.log(error);
	}
});

const port = process.env.PORT || 3000;
const path = '/api/webhook';
const localWebhookUrl = `http://localhost:${port}${path}`;

const middleware = createNodeMiddleware(octokitApp.webhooks, { path });

http.createServer(middleware).listen(port, () => {
	console.log(`Server is listening for events at: ${localWebhookUrl}`);
	console.log('Press Ctrl + C to quit.');
});
