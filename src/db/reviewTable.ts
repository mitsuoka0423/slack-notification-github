import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const REVIEW_TABLE = 'slack-notification-github-review';
let client: DynamoDBDocument | null;

type SlackThread = {
	channelId: string;
	ts: string;
};

type ReviewTableRecord = {
	prUrl: string;
	updatedAt: string;
	slackThread: SlackThread;
};

const init = () => {
	if (!client) {
		client = DynamoDBDocument.from(new DynamoDB({}));
	}
};

const get = async ({
	partitionKey,
	sortKey,
}: { partitionKey: string; sortKey?: string }): Promise<ReviewTableRecord> => {
	console.info('[START]db.reviewTable.get');
	console.debug({ partitionKey, sortKey });

	if (!client) {
		throw new Error('clientを初期化してください');
	}

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
	console.info('[END]db.reviewTable.get');

	return parsedItem as ReviewTableRecord;
};

const getLatest = async ({
	partitionKey,
}: { partitionKey: string }): Promise<ReviewTableRecord> => {
	console.info('[START]db.reviewTable.getLatest');
	console.debug({ partitionKey });

	if (!client) {
		throw new Error('clientを初期化してください');
	}
	const items = await client.query({
		TableName: REVIEW_TABLE,
		KeyConditionExpression: 'prUrl = :prUrl',
		ExpressionAttributeValues: {
			':prUrl': partitionKey,
		},
		ScanIndexForward: false,
	});

	if (!items.Items || items.Items.length < 1) {
		throw new Error(
			`指定されたキーに紐づくデータが存在しません(partitionKey: ${partitionKey})`,
		);
	}

	const latest = items.Items[0];

	console.debug({ latest });
	console.info('[END]db.reviewTable.getLatest');

	return latest as ReviewTableRecord;
};

const set = async ({ prUrl, updatedAt, slackThread }: ReviewTableRecord) => {
	console.info('[START]db.reviewTable.set');
	console.debug({ prUrl, updatedAt, slackThread });

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
	console.info('[END]db.reviewTable.set');
};

export { init, set, get, getLatest };
