<script lang="ts">
	import Card from '#lib/components/Card.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import AreaForm from '#lib/components/admin/AreaForm.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const values = $derived({
		parentId: data.parentId,
		nameDe: '',
		nameEn: '',
		descriptionDe: '',
		descriptionEn: '',
		sortOrder: 0,
		cancelDeadlineHours: null as string | number | null,
		...(form?.values ?? {})
	});
</script>

<PageHeader
	title={i18n.t('admin.areas.new')}
	back={{ href: '/admin/areas', label: i18n.t('admin.areas.title') }}
/>

<Card>
	<AreaForm
		action=""
		{values}
		parents={data.parents}
		allowRoot={data.allowRoot}
		result={form}
		submitLabel={i18n.t('common.create')}
	/>
</Card>
