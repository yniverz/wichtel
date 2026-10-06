<script lang="ts">
	import Card from '#lib/components/Card.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import RoleForm from '#lib/components/admin/RoleForm.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	const i18n = getI18n();
	const values = $derived({
		nameDe: '',
		nameEn: '',
		descriptionDe: '',
		descriptionEn: '',
		...(form?.values ?? {})
	});
</script>

<PageHeader
	title={i18n.t('admin.roles.new')}
	back={{ href: '/admin/roles', label: i18n.t('admin.roles.title') }}
/>
<Card>
	<RoleForm
		action=""
		{values}
		permissions={form?.permissions ?? []}
		result={form}
		submitLabel={i18n.t('common.create')}
	/>
</Card>
