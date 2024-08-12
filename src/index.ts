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
  - URL: ${payload.pull_request.html_url}
- 初回レビュー希望日: 
- 依頼者: @{アサイニー}
`,
	});

	if (response.ok) {
		const { ts, channel } = response;
		console.debug({ ts, channel });

		const { number } = payload.pull_request;
		const repository = payload.pull_request.head.repo?.name;
		const key = `${repository}-${number}`;
		set(key, JSON.stringify({ ts, channel }));
	}
});

octokitApp.webhooks.on(
	'pull_request.reopened',
	async ({ octokit, payload }) => {
		console.log(
			`Received a pull request event for #${payload.pull_request.number}`,
		);
		console.log(JSON.stringify(payload, null, 2));

		const { number } = payload.pull_request;
		const repository = payload.pull_request.head.repo?.name;
		const key = `${repository}-${number}`;

		const { ts, channel } = get<ThreadInfo>(key);
		console.log({ ts, channel });

		const response = await slackApp.client.chat.postMessage({
			channel,
			thread_ts: ts, // NOTE: スレッドに返信する
			// TODO: ユーザーごとに出し分け
			text: `
:memo: 再オープンされました
${payload.pull_request.html_url}
`,
		});

		if (response.ok) {
			const { ts, channel } = response;
			console.debug({ ts, channel });

			const { number } = payload.pull_request;
			const repository = payload.pull_request.head.repo?.name;
			const key = `${repository}-${number}`;
			set(key, JSON.stringify({ ts, channel }));
		}
	},
);

octokitApp.webhooks.on('pull_request.closed', async ({ octokit, payload }) => {
	console.log(
		`Received a pull request event for #${payload.pull_request.number}`,
	);
	console.log(JSON.stringify(payload, null, 2));

	const { number } = payload.pull_request;
	const repository = payload.pull_request.head.repo?.name;
	const key = `${repository}-${number}`;

	const { ts, channel } = get<ThreadInfo>(key);
	console.log({ ts, channel });

	let text: string;
	if (payload.pull_request.merged) {
		text= `
:memo: マージされました！
		`;
	} else {
		text= `
:memo: クローズされました
		`;
	}

	const response = await slackApp.client.chat.postMessage({
		channel,
		thread_ts: ts, // NOTE: スレッドに返信する
		// TODO: ユーザーごとに出し分け
		text,
	});

	if (response.ok) {
		const { ts, channel } = response;
		console.debug({ ts, channel });

		const { number } = payload.pull_request;
		const repository = payload.pull_request.head.repo?.name;
		const key = `${repository}-${number}`;
		set(key, JSON.stringify({ ts, channel }));
	}
});

octokitApp.webhooks.on('pull_request_review', async ({ octokit, payload }) => {
	console.log(
		`Received a pull request event for #${payload.pull_request.number}`,
	);
	console.log(JSON.stringify(payload, null, 2));

	const { number } = payload.pull_request;
	const repository = payload.pull_request.head.repo?.name;
	const key = `${repository}-${number}`;

	const { ts, channel } = get<ThreadInfo>(key);
	console.log({ ts, channel });

	let text: string;
	if (payload.review.state === 'approved') {
		text = ':memo: PRが承認されました！';
	} else {
		text = `
:memo: レビューコメントが追加されました

${payload.review.body}
${payload.review._links.html.href}
`;
	}

	const response = await slackApp.client.chat.postMessage({
		channel,
		thread_ts: ts, // NOTE: スレッドに返信する
		// TODO: ユーザーごとに出し分け
		text,
	});

	if (response.ok) {
		const { ts, channel } = response;
		console.debug({ ts, channel });

		const { number } = payload.pull_request;
		const repository = payload.pull_request.head.repo?.name;
		const key = `${repository}-${number}`;
		set(key, JSON.stringify({ ts, channel }));
	}
});

octokitApp.webhooks.on(
	'pull_request_review',
	async ({ octokit, payload }) => {
		console.log(
			`Received a pull request event for #${payload.pull_request.number}`,
		);
		console.log(JSON.stringify(payload, null, 2));

		const { number } = payload.pull_request;
		const repository = payload.pull_request.head.repo?.name;
		const key = `${repository}-${number}`;

		const { ts, channel } = get<ThreadInfo>(key);
		console.log({ ts, channel });

		const response = await slackApp.client.chat.postMessage({
			channel,
			thread_ts: ts, // NOTE: スレッドに返信する
			// TODO: ユーザーごとに出し分け
			text: `
:memo: PRが承認されました
${payload.pull_request.html_url}
`,
		});

		if (response.ok) {
			const { ts, channel } = response;
			console.debug({ ts, channel });
	
			const { number } = payload.pull_request;
			const repository = payload.pull_request.head.repo?.name;
			const key = `${repository}-${number}`;
			set(key, JSON.stringify({ ts, channel }));
		}
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
