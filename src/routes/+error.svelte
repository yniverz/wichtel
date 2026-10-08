<script lang="ts">
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import { isMessageKey } from '#lib/i18n/index.ts';

	const i18n = getI18n();
	const message = $derived.by(() => {
		const msg = page.error?.message ?? '';
		if (isMessageKey(msg)) return i18n.t(msg);
		if (page.status === 404) return i18n.t('error.notFound');
		if (page.status === 403) return i18n.t('error.forbidden');
		return page.status >= 500 ? i18n.t('error.generic') : msg;
	});
</script>

<main class="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4 py-16 sm:px-6">
	<p class="font-display text-[clamp(6rem,30vw,14rem)] text-brand-text tabular-nums">
		{page.status}
	</p>
	<h1 class="mt-2 text-2xl font-bold">{i18n.t('error.page.title')}</h1>
	<p class="mt-2 max-w-prose text-lg text-ink-muted">{message}</p>
	{#if page.error?.errorId}
		<p class="mt-2 text-sm text-ink-muted">
			{i18n.t('error.page.reference')}
			<code class="font-mono">{page.error.errorId}</code>
		</p>
	{/if}
	<div class="mt-8"><Button href="/">{i18n.t('error.page.home')}</Button></div>
</main>
