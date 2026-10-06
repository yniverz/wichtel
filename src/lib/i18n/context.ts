import { getContext, setContext } from 'svelte';
import { translator, type Locale, type MessageKey, type MessageParams } from './index.ts';

const KEY = Symbol('i18n');

export interface I18n {
	readonly locale: Locale;
	t(key: MessageKey, params?: MessageParams): string;
}

/** Called once in the root layout. `getLocale` is read lazily, so locale changes are reactive. */
export function setI18n(getLocale: () => Locale): I18n {
	const i18n: I18n = {
		get locale() {
			return getLocale();
		},
		t: (key, params) => translator(getLocale())(key, params)
	};
	setContext(KEY, i18n);
	return i18n;
}

export function getI18n(): I18n {
	const i18n = getContext<I18n | undefined>(KEY);
	if (!i18n) throw new Error('i18n context missing – is the root layout mounted?');
	return i18n;
}
