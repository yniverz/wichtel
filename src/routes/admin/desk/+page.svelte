<script lang="ts">
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = getI18n();
</script>

<svelte:head
	><title>{i18n.t('admin.desk.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader title={i18n.t('admin.desk.title')} lead={i18n.t('admin.desk.lead')} />

<form method="GET" class="flex max-w-xl gap-2" role="search">
	<label for="q" class="sr-only">{i18n.t('admin.desk.search')}</label>
	<!-- svelte-ignore a11y_autofocus -->
	<input
		id="q"
		name="q"
		type="search"
		value={data.q}
		autofocus
		placeholder={i18n.t('admin.desk.search')}
		class="h-12 flex-1 text-lg"
	/>
	<Button type="submit" size="lg">{i18n.t('common.search')}</Button>
</form>

{#if data.q}
	{#if data.people.length === 0}
		<p class="mt-6 text-ink-muted">{i18n.t('admin.people.empty')}</p>
	{:else}
		<ul class="mt-6 max-w-xl divide-y divide-line border-y border-line">
			{#each data.people as p (p.id)}
				<li>
					<a
						href="/admin/desk/{p.id}"
						class="flex items-baseline justify-between gap-3 py-3 hover:bg-ink/3"
					>
						<span class="text-lg font-bold">{p.name}</span>
						{#if p.email}<span class="truncate text-sm text-ink-muted">{p.email}</span>{/if}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
{/if}
