import fs from 'node:fs';
import type { APIGatewayProxyHandler } from 'aws-lambda';
import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';

const appId = process.env.GITHUB_APP_ID || '';
const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH || '';
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

// GitHub Appの設定
const app = new App({
	appId,
	privateKey,
});

export const handler: APIGatewayProxyHandler = async (event) => {
	try {
		const payload = JSON.parse(event.body || '{}');
		const githubEvent = event.headers['X-GitHub-Event'];

		if (githubEvent === 'issues' && payload.action === 'opened') {
			const installationId = payload.installation.id;
			const repo = payload.repository.name;
			const owner = payload.repository.owner.login;
			const issueNumber = payload.issue.number;

			console.log({ installationId, repo, owner, issueNumber });

			return {
				statusCode: 200,
				body: JSON.stringify({ message: 'Comment added successfully' }),
			};
		}

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
