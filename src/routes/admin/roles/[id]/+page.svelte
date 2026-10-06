<script lang="ts">
	import Card from '#lib/components/Card.svelte';
	import ConfirmForm from '#lib/components/ConfirmForm.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import RoleForm from '#lib/components/admin/RoleForm.svelte';
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
		permissions?: string[];
	};
	const result = $derived(form as Result | null);
	const values = $derived({
		nameDe: data.item.nameDe,
		nameEn: data.item.nameEn,
		descriptionDe: data.item.descriptionDe,
		descriptionEn: data.item.descriptionEn,
		...(result?.values ?? {})
	});
	const title = $derived(localized(data.item, 'name', i18n.locale));
</script>

<PageHeader {title} back={{ href: '/admin/roles', label: i18n.t('admin.roles.title') }} />

<Card>
	<RoleForm
		action="?/update"
		{values}
		permissions={result?.permissions ?? data.item.permissions}
		{result}
		submitLabel={i18n.t('common.save')}
	/>
</Card>

<div class="mt-6">
	<ConfirmForm
		action="?/delete"
		message={i18n.t('admin.roles.deleteConfirm', { name: title })}
		confirmLabel={i18n.t('common.delete')}
	>
		{i18n.t('common.delete')}
	</ConfirmForm>
	{#if data.usage > 0}<span class="ml-3 text-sm text-ink-muted"
			>{i18n.t('admin.people.count', { count: data.usage })}</span
		>{/if}
</div>
