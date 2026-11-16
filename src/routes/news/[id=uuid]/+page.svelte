<script lang="ts">
	import { page } from '$app/state';
	import NewsArticle from '#lib/components/news/NewsArticle.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{data.post.title} · {page.data.settings.festivalName}</title></svelte:head>

<NewsArticle post={data.post} back="/news" timezone={page.data.settings.timezone} />
