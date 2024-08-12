import { createLocalStorage } from 'bun-storage';

let localStorage: Storage | null;

const init = () => {
	if (!localStorage) {
		localStorage = createLocalStorage('./.cache/db.sqlite');
	}
};

const set = <T>(key: string, object: T) => {
	if (!localStorage) {
		throw new Error('localStorageを初期化してください');
	}

	const encodedKey = encode(key);

	localStorage.setItem(encodedKey, JSON.stringify(object));

	const item = localStorage.getItem(encodedKey) as T;
	console.debug({ encodedKey, item });
};

const get = <T>(key: string): T => {
	if (!localStorage) {
		throw new Error('localStorageを初期化してください');
	}

	console.debug({ key });

	const encodedKey = encode(key);

	console.debug({ encodedKey });

	const item = localStorage.getItem(encodedKey);

	console.debug({ item });

	if (!item) {
		throw new Error(`指定されたキーに紐づくデータが存在しません(key: ${key})`);
	}

	const parsedItem = JSON.parse(JSON.parse(item));

	console.debug({ parsedItem });

	return parsedItem;
};

const encode = (plainText: string): string => {
	return encodeURIComponent(plainText);
};

export { init, set, get };
