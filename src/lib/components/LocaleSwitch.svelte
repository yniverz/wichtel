<script lang="ts">
	import { page } from '$app/state';
	import { getI18n } from '#lib/i18n/context.ts';
	import { LOCALES } from '#lib/i18n/index.ts';

	const i18n = getI18n();
	const next = $derived(page.url.pathname + page.url.search);
</script>

<form method="POST" action="/locale" class="inline-flex items-center text-xs font-semibold">
	<input type="hidden" name="next" value={next} />
	{#each LOCALES as locale, i (locale)}
		{#if i > 0}<span class="text-line" aria-hidden="true">/</span>{/if}
		<button
			name="locale"
			value={locale}
			class="px-1.5 py-1 uppercase transition-colors {i18n.locale === locale
				? 'text-ink underline decoration-2 underline-offset-4'
				: 'text-ink-muted hover:text-ink'}"
			aria-pressed={i18n.locale === locale}
			aria-label={i18n.t(`locale.${locale}`)}
		>
			{locale}
		</button>
	{/each}
</form>
