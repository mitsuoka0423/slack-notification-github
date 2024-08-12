import { config } from 'dotenv';
import fs from 'node:fs';
import http from 'node:http';
import { App as OctokitApp } from '@octokit/app';
import { App as SlackApp } from '@slack/bolt';
import { createNodeMiddleware } from '@octokit/webhooks';

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

await slackApp.client.chat.postMessage({
	// TODO: .envに移動
	channel: process.env.SLACK_API_TARGET_CHANNEL || '',
	// TODO: ユーザーごとに出し分け
	text: `
<@U07GUPMT4E5> <@レビュアー>
レビューお願いします！

- PR
- タイトル: title
- URL: url
- 初回レビュー希望日: 
- 依頼者: @{アサイニー}
`,
});

const { data } = await octokitApp.octokit.request('/app');

octokitApp.octokit.log.debug(`Authenticated as '${data.name}'`);

octokitApp.webhooks.on('pull_request.opened', async ({ octokit, payload }) => {
	console.log(
		`Received a pull request event for #${payload.pull_request.number}`,
	);
	console.log(JSON.stringify(payload, null, 2));
	await slackApp.client.chat.postMessage({
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
	// try {
	// 	await octokit.rest.issues.createComment({
	// 		owner: payload.repository.owner.login,
	// 		repo: payload.repository.name,
	// 		issue_number: payload.pull_request.number,
	// 		body: messageForNewPRs,
	// 	});
	// } catch (error) {
	// 	if (error.response) {
	// 		console.error(
	// 			`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`,
	// 		);
	// 	} else {
	// 		console.error(error);
	// 	}
	// }
});

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
