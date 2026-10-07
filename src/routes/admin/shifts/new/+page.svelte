<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import ShiftForm from '#lib/components/admin/ShiftForm.svelte';
	import type { EditablePosition } from '#lib/components/admin/PositionsEditor.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const values = $derived({ ...data.values, ...(form?.values ?? {}) });
	const positions = $derived.by((): EditablePosition[] => {
		if (form?.positions) {
			try {
				return JSON.parse(form.positions);
			} catch {
				return data.positions;
			}
		}
		return data.positions;
	});
</script>

<PageHeader
	title={i18n.t('admin.shifts.new')}
	back={{ href: '/admin/shifts', label: i18n.t('admin.shifts.title') }}
/>

<ShiftForm
	action=""
	{values}
	{positions}
	areas={data.areas}
	qualifications={data.qualifications}
	places={data.places}
	result={form}
	submitLabel={i18n.t('common.create')}
/>
