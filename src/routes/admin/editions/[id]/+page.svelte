<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import ConfirmForm from '#lib/components/ConfirmForm.svelte';
	import Field from '#lib/components/Field.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const submitter = pendingForm({ reset: false });
	type Result = {
		action?: string;
		error?: string;
		success?: string;
		errors?: Record<string, string>;
		values?: Record<string, string>;
	};
	const result = $derived(form as Result | null);
	const values = $derived({
		name: data.item.name,
		startsOn: data.item.startsOn,
		endsOn: data.item.endsOn,
		...(result?.values ?? {})
	});
</script>

<PageHeader
	title={data.item.name}
	back={{ href: '/admin/editions', label: i18n.t('admin.editions.title') }}
/>

<Card>
	<form method="POST" action="?/update" class="space-y-4" use:enhance={submitter.submit}>
		<FormMessage error={result?.error} success={result?.success} />
		<Field
			label={i18n.t('admin.editions.name')}
			name="name"
			value={values.name}
			error={result?.errors?.name}
		/>
		<div class="grid gap-4 sm:grid-cols-2">
			<Field
				label={i18n.t('admin.editions.startsOn')}
				name="startsOn"
				type="date"
				value={values.startsOn}
				error={result?.errors?.startsOn}
			/>
			<Field
				label={i18n.t('admin.editions.endsOn')}
				name="endsOn"
				type="date"
				value={values.endsOn}
				error={result?.errors?.endsOn}
			/>
		</div>
		<Button type="submit" loading={submitter.pending}>{i18n.t('common.save')}</Button>
	</form>
</Card>

<div class="mt-6">
	{#if data.item.archivedAt}
		<ConfirmForm
			action="?/unarchive"
			variant="secondary"
			message={i18n.t('admin.editions.unarchive') + '?'}
			confirmLabel={i18n.t('admin.editions.unarchive')}
		>
			{i18n.t('admin.editions.unarchive')}
		</ConfirmForm>
	{:else}
		<ConfirmForm
			action="?/archive"
			variant="secondary"
			message={i18n.t('admin.editions.archive') + ': ' + data.item.name + '?'}
			confirmLabel={i18n.t('admin.editions.archive')}
		>
			{i18n.t('admin.editions.archive')}
		</ConfirmForm>
	{/if}
</div>
