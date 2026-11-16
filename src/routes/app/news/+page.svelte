<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import NewsList from '#lib/components/news/NewsList.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = getI18n();
	// Opening the news marks them as read: refresh the unread count in the navigation.
	onMount(() => invalidate('app:news'));
</script>

<svelte:head><title>{i18n.t('news.title')} · {page.data.settings.festivalName}</title></svelte:head>

<header class="border-b border-ink pb-4">
	<h1 class="font-display text-5xl uppercase sm:text-6xl">{i18n.t('news.title')}</h1>
	<p class="mt-2 text-ink-muted">{i18n.t('news.lead')}</p>
</header>

<div class="max-w-2xl">
	{#if data.posts.length === 0}
		<p class="mt-8 text-ink-muted">{i18n.t('news.empty')}</p>
	{:else}
		<NewsList posts={data.posts} base="/app/news" timezone={page.data.settings.timezone} />
	{/if}
</div>
