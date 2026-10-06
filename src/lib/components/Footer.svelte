<script lang="ts">
	import { page } from '$app/state';
	import { getI18n } from '#lib/i18n/context.ts';

	const i18n = getI18n();
	const settings = $derived(page.data.settings);
</script>

<footer class="mx-auto w-full max-w-6xl px-4 sm:px-6">
	<div
		class="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line py-5 text-xs text-ink-muted"
	>
		{#if settings?.imprintUrl}<a class="hover:text-ink" href={settings.imprintUrl}
				>{i18n.t('footer.imprint')}</a
			>{/if}
		{#if settings?.privacyUrl}<a class="hover:text-ink" href={settings.privacyUrl}
				>{i18n.t('footer.privacy')}</a
			>{/if}
		{#if settings?.contactEmail}<a class="hover:text-ink" href="mailto:{settings.contactEmail}"
				>{i18n.t('footer.contact')}</a
			>{/if}
		<a class="ml-auto hover:text-ink" href="https://github.com/yniverz/wichtel"
			>{i18n.t('footer.poweredBy')}</a
		>
	</div>
</footer>
