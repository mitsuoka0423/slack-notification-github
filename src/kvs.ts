import {
	type LocalStoragePonyfill,
	createLocalStorage,
} from 'localstorage-ponyfill';

let localStorage: LocalStoragePonyfill | null;

const init = () => {
	if (!localStorage) {
		localStorage = createLocalStorage();
	}
};

const set = <T>(key: string, object: T) => {
	if (!localStorage) {
		throw new Error('localStorageを初期化してください');
	}

	localStorage.setItem(key, JSON.stringify(object));
};

const get = <T>(key: string): T => {
	if (!localStorage) {
		throw new Error('localStorageを初期化してください');
	}

	const item = localStorage.getItem(key);

	if (!item) {
		throw new Error(`指定されたキーに紐づくデータが存在しません(key: ${key})`);
	}

	return JSON.parse(item) as T;
};

export { init, set, get };
