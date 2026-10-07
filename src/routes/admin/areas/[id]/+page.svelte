<script lang="ts">
	import Card from '#lib/components/Card.svelte';
	import ConfirmForm from '#lib/components/ConfirmForm.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import AreaForm from '#lib/components/admin/AreaForm.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import { localized } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	type Result = {
		action?: string;
		error?: string;
		success?: string;
		errors?: Record<string, string>;
		values?: Record<string, string>;
	};
	const result = $derived(form as Result | null);
	const values = $derived({
		parentId: data.item.parentId ?? '',
		nameDe: data.item.nameDe,
		nameEn: data.item.nameEn,
		descriptionDe: data.item.descriptionDe,
		descriptionEn: data.item.descriptionEn,
		sortOrder: data.item.sortOrder,
		cancelDeadlineHours: data.item.cancelDeadlineHours as string | number | null,
		pointsPerShift: data.item.pointsPerShift as string | number | null,
		pointsPerHour: data.item.pointsPerHour as string | number | null,
		...(result?.action === 'update' ? (result.values ?? {}) : {})
	});
	const title = $derived(localized(data.item, 'name', i18n.locale));
</script>

<PageHeader {title} back={{ href: '/admin/areas', label: i18n.t('admin.areas.title') }} />

{#if data.path.length}
	<p class="-mt-4 mb-6 text-sm text-ink-muted">
		{data.path.map((p) => localized(p, 'name', i18n.locale)).join(' › ')} › {title}
	</p>
{/if}

<div class="space-y-6">
	<Card title={i18n.t('admin.areas.edit')}>
		<AreaForm
			action="?/update"
			{values}
			parents={data.parents}
			allowRoot={data.allowRoot}
			result={result?.action === 'update' ? result : null}
			submitLabel={i18n.t('common.save')}
		/>
	</Card>

	{#if data.assignments.length}
		<Card title={i18n.t('admin.areas.roles')}>
			<ul class="divide-y divide-line">
				{#each data.assignments as a (a.id)}
					<li class="flex justify-between gap-3 py-2 text-sm">
						<a href="/admin/people/{a.userId}" class="font-medium hover:text-brand-text"
							>{a.firstName} {a.lastName}</a
						>
						<span class="text-ink-muted"
							>{i18n.locale === 'en' && a.roleNameEn ? a.roleNameEn : a.roleNameDe}</span
						>
					</li>
				{/each}
			</ul>
		</Card>
	{/if}

	<div class="space-y-3">
		{#if result?.action === 'delete'}<FormMessage error={result.error} />{/if}
		{#if data.hasChildren}
			<p class="text-sm text-ink-muted">{i18n.t('error.areaHasChildren')}</p>
		{:else}
			<ConfirmForm
				action="?/delete"
				message={i18n.t('admin.areas.deleteConfirm', { name: title })}
				confirmLabel={i18n.t('common.delete')}
			>
				{i18n.t('common.delete')}
			</ConfirmForm>
		{/if}
	</div>
</div>
