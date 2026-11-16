<script lang="ts">
	import { page } from '$app/state';
	import NewsList from '#lib/components/news/NewsList.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = getI18n();
</script>

<svelte:head><title>{i18n.t('news.title')} · {page.data.settings.festivalName}</title></svelte:head>

<h1 class="font-display border-b-2 border-ink pb-3 text-5xl uppercase">{i18n.t('news.title')}</h1>
{#if data.posts.length === 0}
	<p class="mt-8 text-ink-muted">{i18n.t('news.empty')}</p>
{:else}
	<NewsList posts={data.posts} base="/news" timezone={page.data.settings.timezone} />
{/if}
