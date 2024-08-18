import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const REVIEW_TABLE = 'slack-notification-github-review';
let client: DynamoDBDocument | null;

type SlackThread = {
	channelId: string,
	ts: string,
};

type ReviewTableProps = {
	prUrl: string,
	updatedAt: string,
	slackThread: SlackThread,
};

const init = () => {
	if (!client) {
		client = DynamoDBDocument.from(new DynamoDB({}));
	}
};

const get = async ({
	partitionKey,
	sortKey,
}: { partitionKey: string; sortKey?: string }): Promise<ReviewTableProps> => {
	if (!client) {
		throw new Error('clientを初期化してください');
	}
	console.debug({ partitionKey, sortKey });

	const item = await client.get({
		TableName: REVIEW_TABLE,
		Key: {
			prUrl: partitionKey,
			updatedAt: sortKey,
		},
	});

	console.debug({ item });

	if (!item.Item) {
		throw new Error(
			`指定されたキーに紐づくデータが存在しません(partitionKey: ${partitionKey}, sortKey: ${sortKey})`,
		);
	}

	const parsedItem = item.Item;

	console.debug({ parsedItem });

	return parsedItem as ReviewTableProps;
};

const set = async ({
	prUrl,
	updatedAt,
	slackThread
}: ReviewTableProps) => {
	console.debug({prUrl, updatedAt, slackThread});

	if (!client) {
		throw new Error('clientを初期化してください');
	}

	await client.put({
		TableName: REVIEW_TABLE,
		Item: {
			prUrl,
			updatedAt,
			slackThread,
		},
	});

	const item = await get({ partitionKey: prUrl, sortKey: updatedAt });
	console.debug({ prUrl, item });
};

export { init, set, get };
