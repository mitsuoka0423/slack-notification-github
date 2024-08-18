import type { HandlerFunction } from '@octokit/webhooks/dist-types/types';
import { postToReviewChannel } from '../../api/slackApp';
import { get, set } from '../../db/reviewTable';

export const handle: HandlerFunction<'pull_request.closed', unknown> = async ({
	payload,
}) => {
	console.info('[START]octokitWebhooks.on(pull_request.closed)');
	console.debug({ payload: JSON.stringify(payload, null, 2) });

	const data  = await get({partitionKey: payload.pull_request.html_url, });

	const response = await postToReviewChannel({
		text: `
クローズされました

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

	console.info('[END]octokitWebhooks.on(pull_request.closed)');
};
