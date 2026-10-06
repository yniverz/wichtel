<script lang="ts">
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDateTime, isMessageKey } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = getI18n();
	const label = (action: string) => {
		const key = `audit.${action}`;
		return isMessageKey(key) ? i18n.t(key) : action;
	};
	const timeZone = $derived(page.data.settings.timezone);
</script>

<svelte:head
	><title>{i18n.t('admin.audit.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader title={i18n.t('admin.audit.title')} lead={i18n.t('admin.audit.lead')} />

{#if data.entries.length === 0}
	<p class="text-ink-muted">{i18n.t('admin.audit.empty')}</p>
{:else}
	<ol class="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-raised">
		{#each data.entries as entry (entry.id)}
			<li class="px-5 py-3">
				<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<span class="font-medium">{label(entry.action)}</span>
					<span class="text-sm text-ink-muted">
						{entry.actorFirstName
							? `${entry.actorFirstName} ${entry.actorLastName}`
							: i18n.t('admin.audit.system')}
					</span>
					<time
						class="ml-auto text-xs text-ink-muted tabular-nums"
						datetime={new Date(entry.createdAt).toISOString()}
					>
						{formatDateTime(new Date(entry.createdAt), i18n.locale, timeZone)}
					</time>
				</div>
				{#if entry.reason}<p class="mt-1 text-sm">{entry.reason}</p>{/if}
				{#if Object.keys(entry.data ?? {}).length}
					<details class="mt-1 text-sm">
						<summary class="cursor-pointer text-ink-muted">{i18n.t('admin.audit.details')}</summary>
						<pre class="mt-2 overflow-x-auto rounded-lg bg-surface p-3 text-xs">{JSON.stringify(
								entry.data,
								null,
								2
							)}</pre>
					</details>
				{/if}
			</li>
		{/each}
	</ol>
	{#if data.hasMore}
		<div class="mt-4 text-center">
			<Button href="?before={data.entries.at(-1)?.id}" variant="secondary"
				>{i18n.t('admin.audit.older')}</Button
			>
		</div>
	{/if}
{/if}
