<script lang="ts">
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = getI18n();
	const pages = $derived(Math.ceil(data.total / data.pageSize));
	const link = (p: number) =>
		`?${new URLSearchParams({ ...(data.q ? { q: data.q } : {}), page: String(p) })}`;
</script>

<svelte:head
	><title>{i18n.t('admin.people.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader title={i18n.t('admin.people.title')} lead={i18n.t('admin.people.lead')} />
{#if page.url.searchParams.get('deleted')}
	<div class="mb-4"><Alert tone="success">{i18n.t('privacy.adminDeleted')}</Alert></div>
{/if}

<form method="GET" class="mb-4 flex gap-2" role="search" data-sveltekit-keepfocus>
	<label for="q" class="sr-only">{i18n.t('common.search')}</label>
	<input
		id="q"
		type="search"
		name="q"
		value={data.q}
		placeholder={i18n.t('admin.people.search')}
		class="h-11 flex-1"
		oninput={(e) => {
			const form = e.currentTarget.form;
			clearTimeout((form as unknown as { _t?: number })._t);
			(form as unknown as { _t?: number })._t = window.setTimeout(() => form?.requestSubmit(), 300);
		}}
	/>
	<Button type="submit" variant="secondary">{i18n.t('common.search')}</Button>
</form>

<p class="mb-2 text-sm text-ink-muted">{i18n.t('admin.people.count', { count: data.total })}</p>

{#if data.people.length === 0}
	<p class="rounded-xl border border-dashed border-line p-8 text-center text-ink-muted">
		{i18n.t('admin.people.empty')}
	</p>
{:else}
	<ul class="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-raised">
		{#each data.people as person (person.id)}
			<li>
				<a
					href="/admin/people/{person.id}"
					class="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-ink/3"
				>
					<span class="min-w-40 flex-1 font-medium">{person.lastName}, {person.firstName}</span>
					<span class="min-w-0 flex-1 truncate text-sm text-ink-muted">{person.email ?? ''}</span>
					<span class="flex gap-1">
						{#if person.isAdmin}<Badge tone="brand">{i18n.t('admin.people.adminBadge')}</Badge>{/if}
						{#if !person.emailVerifiedAt}<Badge tone="warning"
								>{i18n.t('admin.people.unverified')}</Badge
							>{/if}
					</span>
				</a>
			</li>
		{/each}
	</ul>
	{#if pages > 1}
		<nav class="mt-4 flex justify-center gap-2" aria-label="Pagination">
			{#each Array.from({ length: pages }, (_, i) => i) as p (p)}
				<a
					href={link(p)}
					class="rounded-md px-3 py-1 text-sm {p === data.pageNo
						? 'bg-brand text-brand-fg'
						: 'border border-line'}"
					aria-current={p === data.pageNo ? 'page' : undefined}>{p + 1}</a
				>
			{/each}
		</nav>
	{/if}
{/if}
