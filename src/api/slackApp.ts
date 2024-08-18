import { App } from '@slack/bolt';

let slack: App | null;

let token: string | null;
let signingSecret: string | null;
let reviewChannel: string | null;
let debugChannel: string | null;

export const init = ({
	_token,
	_signingSecret,
	_reviewChannel,
	_debugChannel,
}: {
	_token: string;
	_signingSecret: string;
	_reviewChannel: string;
	_debugChannel: string;
}) => {
	token = _token;
	signingSecret=_signingSecret;
	reviewChannel=_reviewChannel;
	debugChannel=_debugChannel;

	slack = new App({
		token,
		signingSecret,
	});
};

export const postToReviewChannel = async ({ text }: { text: string }) => {
	return slack.client.chat.postMessage({
		channel: reviewChannel,
		text,
	});
};

export const postToDebugChannel = async ({ text }: { text: string }) => {
	return slack.client.chat.postMessage({
		channel: debugChannel,
		text,
	});
};

// TODO: 実装
export const addReactionToReviewChannel = () => {};
