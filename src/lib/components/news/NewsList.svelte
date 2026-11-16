<script lang="ts">
	import Badge from '#lib/components/Badge.svelte';
	import RichText from '#lib/components/RichText.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDateTime } from '#lib/i18n/index.ts';
	import type { NewsView } from '#lib/server/news-views.ts';

	/** News posts; long ones show their beginning and link to the full post under `base`. */
	let {
		posts,
		base,
		timezone,
		compact = false
	}: { posts: NewsView[]; base: string; timezone: string; compact?: boolean } = $props();
	const i18n = getI18n();
</script>

<ul class="divide-y divide-line">
	{#each posts as post (post.id)}
		<li class="py-5 {post.pinned ? 'border-l-4 border-l-brand pl-4' : ''}">
			<p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted tabular-nums">
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
			<h3 class="mt-1 text-lg font-bold">
				<a href="{base}/{post.id}" class="hover:underline">{post.title}</a>
			</h3>
			{#if post.html && !compact}
				<RichText html={post.html} class="mt-2" />
			{:else}
				<p class="mt-1 text-ink-muted">{post.excerpt}</p>
				{#if !post.html}<a
						href="{base}/{post.id}"
						class="mt-2 inline-block text-sm font-semibold text-brand-text hover:underline"
						>{i18n.t('news.readMore')} →</a
					>{/if}
			{/if}
		</li>
	{/each}
</ul>
