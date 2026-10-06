<script lang="ts">
	import './layout.css';
	import defaultFavicon from '#lib/assets/favicon.svg';
	import { setI18n } from '#lib/i18n/context.ts';
	import { readableTextColor } from '#lib/domain/color.ts';
	import { assetUrl } from '#lib/assets.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	setI18n(() => data.locale);

	// Colors are validated hex values from the settings, so inlining them is safe.
	const themeCss = $derived(
		`:root{--brand:${data.settings.primaryColor};--brand-fg:${readableTextColor(data.settings.primaryColor)};--accent:${data.settings.accentColor};--accent-fg:${readableTextColor(data.settings.accentColor)}}`
	);
	const favicon = $derived(
		data.settings.faviconAssetId ? assetUrl(data.settings.faviconAssetId) : defaultFavicon
	);
</script>

<svelte:head>
	<title>{data.settings.festivalName}</title>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content={data.settings.primaryColor} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html `<style>${themeCss}</style>`}
</svelte:head>

{@render children()}
