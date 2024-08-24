import { App } from '@slack/bolt';

let slack: App;

let token: string | null;
let signingSecret: string | null;
let reviewChannel: string | null;
let debugChannel: string | null;
let reactionApprove: string | null;
let reactionMerge: string | null;
let reactionClose: string | null;

type Timestamp = string;

export const init = ({
	_token,
	_signingSecret,
	_reviewChannel,
	_debugChannel,
	_reactionApprove,
	_reactionMerge,
	_reactionClose,
}: {
	_token: string;
	_signingSecret: string;
	_reviewChannel: string;
	_debugChannel: string;
	_reactionApprove: string;
	_reactionMerge: string;
	_reactionClose: string;
}) => {
	token = _token;
	signingSecret = _signingSecret;
	reviewChannel = _reviewChannel;
	debugChannel = _debugChannel;
	reactionApprove = _reactionApprove;
	reactionMerge = _reactionMerge;
	reactionClose = _reactionClose;

	slack = new App({
		token,
		signingSecret,
	});
};

export const postToReviewChannel = async ({
	text,
	replyTo,
}: { text: string; replyTo?: Timestamp }) => {
	console.info('[START]api.slack.postToReviewChannel');
	console.debug({ text, replyTo });

	const response = await slack.client.chat.postMessage({
		channel: reviewChannel,
		text,
		thread_ts: replyTo,
	});

	console.debug({ response });
	console.info('[END]api.slack.postToReviewChannel');

	return response;
};

export const postToDebugChannel = async ({ text }: { text: string }) => {
	console.info('[START]api.slack.postToDebugChannel');
	console.debug({ text });

	const response = await slack.client.chat.postMessage({
		channel: debugChannel,
		text,
	});

	console.debug({ response });
	console.info('[END]api.slack.postToDebugChannel');

	return response;
};

export const addReactionToReviewChannel = () => {};
