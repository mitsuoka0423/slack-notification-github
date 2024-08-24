import { get as getGithubAppWebhookSecret } from './githubAppWebhookSecret';
import { get as getSlackApiBotToken } from './slackApiBotToken';
import { get as getSlackApiDebugChannel } from './slackApiDebugChannel';
import { get as getSlackApiReactionApprove } from './slackApiReactionApprove';
import { get as getSlackApiReactionClose } from './slackApiReactionClose';
import { get as getSlackApiReactionMerge } from './slackApiReactionMerge';
import { get as getSlackApiReviewChannel } from './slackApiReviewChannel';
import { get as getSlackApiSigningSecret } from './slackApiSigningSecret';

export const ENV = {
	GITHUB_APP_WEBHOOK_SECRET: getGithubAppWebhookSecret(),
	SLACK_API_REVIEW_CHANNEL: getSlackApiReviewChannel(),
	SLACK_API_DEBUG_CHANNEL: getSlackApiDebugChannel(),
	SLACK_API_BOT_TOKEN: getSlackApiBotToken(),
	SLACK_API_SIGNING_SECRET: getSlackApiSigningSecret(),
	SLACK_API_REACTION_APPROVE: getSlackApiReactionApprove(),
	SLACK_API_REACTION_MERGE: getSlackApiReactionMerge(),
	SLACK_API_REACTION_CLOSE: getSlackApiReactionClose(),
};
