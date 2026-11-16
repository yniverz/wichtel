<script lang="ts">
	import Badge from '#lib/components/Badge.svelte';
	import RichText from '#lib/components/RichText.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDateTime } from '#lib/i18n/index.ts';
	import type { NewsView } from '#lib/server/news-views.ts';

	let { post, back, timezone }: { post: NewsView; back: string; timezone: string } = $props();
	const i18n = getI18n();
</script>

<article class="max-w-prose">
	<a href={back} class="mb-2 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
		><span aria-hidden="true">←</span> {i18n.t('news.all')}</a
	>
	<h1 class="font-display border-b-2 border-ink pb-3 text-4xl uppercase sm:text-5xl">
		{post.title}
	</h1>
	<p class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted tabular-nums">
		{#if post.pinned}<Badge tone="brand">{i18n.t('news.pinned')}</Badge>{/if}
		<time datetime={post.publishedAt}
			>{formatDateTime(new Date(post.publishedAt), i18n.locale, timezone)}</time
		>
		{#if post.updatedAt}<span
				>{i18n.t('news.updated', {
					date: formatDateTime(new Date(post.updatedAt), i18n.locale, timezone)
				})}</span
			>{/if}
	</p>
	{#if post.html}<RichText html={post.html} class="mt-6" />{/if}
</article>
