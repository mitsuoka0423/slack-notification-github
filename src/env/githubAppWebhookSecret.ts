const key = 'GITHUB_APP_WEBHOOK_SECRET';

let value: string | undefined;

export const get = (): string => {
	if (!value) {
		value = process.env[key];
	}

	if (!value) {
		throw new Error(`環境変数に${key}が設定されていません`);
	}

	return value;
};
