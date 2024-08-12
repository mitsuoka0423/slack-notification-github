import fs from 'node:fs';
import http from 'node:http';
import { App } from '@octokit/app';
import { createNodeMiddleware } from '@octokit/webhooks';

const appId = process.env.APP_ID || '';
const privateKeyPath = process.env.PRIVATE_KEY_PATH || '';
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const secret = process.env.WEBHOOK_SECRET || '';
const enterpriseHostname = process.env.ENTERPRISE_HOSTNAME;
// const messageForNewPRs = fs.readFileSync('./message.md', 'utf8');

const app = new App({
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

const { data } = await app.octokit.request('/app');

app.octokit.log.debug(`Authenticated as '${data.name}'`);

app.webhooks.on('pull_request.opened', async ({ octokit, payload }) => {
	console.log(
		`Received a pull request event for #${payload.pull_request.number}`,
	);
	console.log(JSON.stringify(payload, null, 2));
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

app.webhooks.onError((error) => {
	if (error.name === 'AggregateError') {
		console.log(`Error processing request: ${error.event}`);
	} else {
		console.log(error);
	}
});

const port = process.env.PORT || 3000;
const path = '/api/webhook';
const localWebhookUrl = `http://localhost:${port}${path}`;

const middleware = createNodeMiddleware(app.webhooks, { path });

http.createServer(middleware).listen(port, () => {
	console.log(`Server is listening for events at: ${localWebhookUrl}`);
	console.log('Press Ctrl + C to quit.');
});
