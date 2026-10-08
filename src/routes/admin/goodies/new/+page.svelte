<script lang="ts">
	import PageHeader from '#lib/components/PageHeader.svelte';
	import GoodieForm from '#lib/components/admin/GoodieForm.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
</script>

<PageHeader
	title={i18n.t('admin.goodies.new')}
	back={{ href: '/admin/goodies', label: i18n.t('admin.goodies.title') }}
/>
<GoodieForm
	action=""
	values={data.values}
	areas={data.areas}
	places={data.places}
	result={form}
	submitLabel={i18n.t('common.create')}
/>
