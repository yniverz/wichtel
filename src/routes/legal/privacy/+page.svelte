<script lang="ts">
	import { page } from '$app/state';
	import { getI18n } from '#lib/i18n/context.ts';
	import LegalText from '../LegalText.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = getI18n();
</script>

<svelte:head
	><title>{i18n.t('legal.privacyTitle')} · {page.data.settings.festivalName}</title></svelte:head
>

<LegalText title={i18n.t('legal.privacyTitle')} html={data.html} />
