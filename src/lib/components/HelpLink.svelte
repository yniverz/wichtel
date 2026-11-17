<script lang="ts">
	import { page } from '$app/state';
	import { helpLink } from '#lib/help.ts';
	import { getI18n } from '#lib/i18n/context.ts';

	/** Round "?" that opens the help page for the current page in a new tab. */
	let { class: className = '' }: { class?: string } = $props();
	const i18n = getI18n();
	const href = $derived(helpLink(page.route.id, i18n.locale, page.data.settings?.helpUrl));
</script>

{#if href}
	<a
		{href}
		target="_blank"
		rel="noopener"
		class="grid size-8 shrink-0 place-items-center rounded-full border border-ink/25 text-sm font-bold text-ink-muted transition-colors hover:border-ink hover:text-ink {className}"
		title={i18n.t('common.helpForPage')}
		aria-label={i18n.t('common.helpForPage')}>?</a
	>
{/if}
