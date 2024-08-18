import type { HandlerFunction } from '@octokit/webhooks/dist-types/types';
import { postToReviewChannel } from '../../api/slackApp';
import { set } from '../../db/reviewTable';

export const handle: HandlerFunction<'pull_request.opened', unknown> = async ({
	payload,
}) => {
	console.info('[START]handler.pullRequest.opened');
	console.debug({ payload: JSON.stringify(payload, null, 2) });

	const response = await postToReviewChannel({
		text: `
@{メンション}
レビューお願いします！

${payload.pull_request.html_url}
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

	console.info('[END]handler.pullRequest.opened');
};
