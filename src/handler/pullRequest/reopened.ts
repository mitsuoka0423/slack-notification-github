import type { HandlerFunction } from '@octokit/webhooks/dist-types/types';
import { postToReviewChannel } from '../../api/slackApp';
import { getLatest, set } from '../../db/reviewTable';

export const handle: HandlerFunction<'pull_request.reopened', unknown> = async ({
	payload,
}) => {
	console.info('[START]handler.pullRequest.reopened');
	console.debug({ payload: JSON.stringify(payload, null, 2) });

	const data = await getLatest({ partitionKey: payload.pull_request.html_url });

	const response = await postToReviewChannel({
		text: `
再オープンされました

${payload.pull_request.html_url}
`,
		replyTo: data.slackThread.ts,
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

	console.info('[END]handler.pullRequest.reopened');
};
