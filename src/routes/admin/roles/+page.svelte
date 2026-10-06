<script lang="ts">
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import { localized } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = getI18n();
</script>

<svelte:head
	><title>{i18n.t('admin.roles.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader title={i18n.t('admin.roles.title')} lead={i18n.t('admin.roles.lead')}>
	{#snippet actions()}<Button href="/admin/roles/new">{i18n.t('admin.roles.new')}</Button>{/snippet}
</PageHeader>

{#if data.roles.length === 0}
	<p class="text-ink-muted">{i18n.t('admin.roles.empty')}</p>
{:else}
	<ul class="grid gap-3 sm:grid-cols-2">
		{#each data.roles as role (role.id)}
			<li>
				<a
					href="/admin/roles/{role.id}"
					class="block h-full rounded-xl border border-line bg-surface-raised p-5 transition hover:border-brand"
				>
					<p class="font-semibold">{localized(role, 'name', i18n.locale)}</p>
					{#if localized(role, 'description', i18n.locale)}
						<p class="mt-1 text-sm text-ink-muted">{localized(role, 'description', i18n.locale)}</p>
					{/if}
					<p class="mt-3 text-xs text-ink-muted">
						{i18n.t('admin.roles.permissionCount', { count: role.permissions.length })} ·
						{i18n.t('admin.people.count', { count: role.usage })}
					</p>
				</a>
			</li>
		{/each}
	</ul>
{/if}
