<script lang="ts">
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { isPinned } from '#lib/domain/news.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDateTime, localized, type MessageKey } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = getI18n();
	const tz = $derived(page.data.settings.timezone);
	const published = $derived(page.url.searchParams.get('published'));
	const now = new Date();
</script>

<svelte:head
	><title>{i18n.t('admin.news.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader title={i18n.t('admin.news.title')} lead={i18n.t('admin.news.lead')}>
	{#snippet actions()}<Button href="/admin/news/new">{i18n.t('admin.news.new')}</Button>{/snippet}
</PageHeader>

{#if published !== null}
	<div class="mb-6 max-w-2xl">
		<Alert tone="success"
			>{published === ''
				? i18n.t('admin.news.published')
				: i18n.t('admin.news.publishedMailed', { count: Number(published) })}</Alert
		>
	</div>
{/if}

{#if data.posts.length === 0}
	<p class="text-ink-muted">{i18n.t('admin.news.empty')}</p>
{:else}
	<ul class="divide-y divide-line border-y border-line">
		{#each data.posts as p (p.id)}
			<li>
				<a href="/admin/news/{p.id}" class="block py-4 hover:bg-ink/3">
					<p class="flex flex-wrap items-center gap-2 font-bold">
						{localized(p, 'title', i18n.locale)}
						{#if isPinned({ pinned: p.pinned, pinnedUntil: p.pinnedUntil ? new Date(p.pinnedUntil) : null }, now)}<Badge
								tone="brand">{i18n.t('news.pinned')}</Badge
							>{/if}
					</p>
					<p class="mt-1 flex flex-wrap gap-x-4 text-sm text-ink-muted">
						<span class="tabular-nums"
							>{formatDateTime(new Date(p.publishedAt), i18n.locale, tz)}</span
						>
						<span>{i18n.t(`news.audience.${p.audience}` as MessageKey)}</span>
						{#if p.mailed !== null}<span>{i18n.t('admin.news.mailedTo', { count: p.mailed })}</span
							>{/if}
						{#if p.author}<span>{p.author}</span>{/if}
					</p>
				</a>
			</li>
		{/each}
	</ul>
{/if}
