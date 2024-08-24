import type { HandlerFunction } from '@octokit/webhooks/dist-types/types';
import { postToReviewChannel } from '../../api/slackApp';
import { getLatest, set } from '../../db/reviewTable';

export const handle: HandlerFunction<'pull_request_review', unknown> = async ({
	payload,
}) => {
	console.info('[START]handler.pullRequestRequest.index');
	console.debug({ payload: JSON.stringify(payload, null, 2) });

	const data = await getLatest({ partitionKey: payload.pull_request.html_url });

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

	const response = await postToReviewChannel({
		text,
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
	};

	console.info('[END]handler.pullRequestRequest.index');
};
