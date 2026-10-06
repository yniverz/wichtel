<script lang="ts">
	import { getI18n } from '#lib/i18n/context.ts';
	import { isMessageKey } from '#lib/i18n/index.ts';

	/** Short-lived status message, announced to screen readers. Pass a new `token` to re-show. */
	let {
		message,
		tone = 'success',
		token
	}: { message?: string | null; tone?: 'success' | 'error'; token?: unknown } = $props();
	const i18n = getI18n();
	let visible = $state(false);

	$effect(() => {
		void token;
		if (!message) return;
		visible = true;
		const t = setTimeout(() => (visible = false), tone === 'error' ? 7000 : 3500);
		return () => clearTimeout(t);
	});
</script>

<div
	class="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:bottom-6"
	aria-live="polite"
>
	{#if visible && message}
		<p
			class="pointer-events-auto max-w-md rounded-md px-4 py-3 text-sm font-semibold shadow-[0_10px_30px_-10px_rgb(0_0_0/0.5)] {tone ===
			'error'
				? 'bg-red-700 text-white'
				: 'bg-ink text-surface'}"
		>
			{isMessageKey(message) ? i18n.t(message) : message}
		</p>
	{/if}
</div>
