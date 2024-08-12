import { App } from '@octokit/app';
import { serve } from 'bun';

if (!process.env.GITHUB_APP_ID) {
	throw new Error('環境変数にGITHUB_APP_IDを設定してください');
}

if (!process.env.GITHUB_PRIVATE_KEY) {
	throw new Error('環境変数にGITHUB_PRIVATE_KEYを設定してください');
}

if (!process.env.GITHUB_WEBHOOK_SECRET) {
	throw new Error('環境変数にGITHUB_WEBHOOK_SECRETを設定してください');
}

const app = new App({
	appId: process.env.GITHUB_APP_ID,
	privateKey: process.env.GITHUB_PRIVATE_KEY,
	webhooks: {
		secret: process.env.GITHUB_WEBHOOK_SECRET,
	},
});

app.webhooks.on('pull_request.opened', async ({ octokit, payload }) => {
	const { repository, pull_request } = payload;

	console.log('新しいPRが作成されました！');
	console.log('----------------------------');
	console.log(`リポジトリ: ${repository.full_name}`);
	console.log(`タイトル: ${pull_request.title}`);
	console.log(`作成者: ${pull_request.user.login}`);
	console.log(`URL: ${pull_request.html_url}`);
	console.log('----------------------------');
});

const server = serve({
	fetch: async (request) => {
		return new Response('OK');
	},
	port: process.env.PORT || 3000,
});

console.log(`サーバーが起動しました: ${server.url}`);
