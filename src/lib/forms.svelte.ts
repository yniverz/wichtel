import type { SubmitFunction } from '$app/forms';

/**
 * Tracks whether an enhanced form is being submitted, for loading indicators:
 * `<form use:enhance={form.submit}>` + `<Button loading={form.pending}>`.
 */
export function pendingForm(options: { reset?: boolean } = {}) {
	let pending = $state(false);
	const submit: SubmitFunction = () => {
		pending = true;
		return async ({ update }) => {
			try {
				await update({ reset: options.reset ?? true });
			} finally {
				pending = false;
			}
		};
	};
	return {
		get pending() {
			return pending;
		},
		submit
	};
}
