<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import Field from '#lib/components/Field.svelte';
	import FieldInputs from '#lib/components/FieldInputs.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { LOCALES } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const accountForm = pendingForm({ reset: false });
	const fieldsForm = pendingForm({ reset: false });

	type Result = {
		action?: string;
		error?: string;
		success?: string;
		errors?: Record<string, string>;
		values?: Record<string, string>;
	};
	const result = $derived(form as Result | null);
	const accountResult = $derived(result?.action === 'account' ? result : null);
	const fieldsResult = $derived(result?.action === 'fields' ? result : null);
	const values = $derived({ ...data.person, ...(accountResult?.values ?? {}) });
	const name = $derived(`${data.person.firstName} ${data.person.lastName}`);
</script>

<svelte:head
	><title>{i18n.t('admin.people.edit')} · {name} · {page.data.settings.festivalName}</title
	></svelte:head
>

<PageHeader
	title={i18n.t('admin.people.edit')}
	back={{ href: `/admin/people/${data.person.id}`, label: name }}
/>

<div class="max-w-2xl space-y-6">
	<Card title={i18n.t('profile.personal')}>
		<form method="POST" action="?/account" class="space-y-4" use:enhance={accountForm.submit}>
			<FormMessage error={accountResult?.error} success={accountResult?.success} />
			<div class="grid gap-4 sm:grid-cols-2">
				<Field
					label={i18n.t('field.firstName')}
					name="firstName"
					autocomplete="off"
					value={values.firstName}
					error={accountResult?.errors?.firstName}
				/>
				<Field
					label={i18n.t('field.lastName')}
					name="lastName"
					autocomplete="off"
					value={values.lastName}
					error={accountResult?.errors?.lastName}
				/>
			</div>
			<Field
				label={i18n.t('field.email')}
				name="email"
				type="email"
				autocomplete="off"
				hint={i18n.t('admin.people.emailHint')}
				value={values.email}
				error={accountResult?.errors?.email}
			/>
			<Field
				label={i18n.t('field.phone')}
				name="phone"
				type="tel"
				autocomplete="off"
				value={values.phone}
				error={accountResult?.errors?.phone}
			/>
			<div class="space-y-1.5">
				<label for="locale" class="text-sm font-medium">{i18n.t('field.locale')}</label>
				<select id="locale" name="locale" class="block h-11 w-full" value={values.locale}>
					{#each LOCALES as l (l)}<option value={l}>{i18n.t(`locale.${l}`)}</option>{/each}
				</select>
			</div>
			<Button type="submit" loading={accountForm.pending}>{i18n.t('common.save')}</Button>
		</form>
	</Card>

	{#if data.fields.length}
		<Card title={i18n.t('admin.people.fields')}>
			<form method="POST" action="?/fields" class="space-y-4" use:enhance={fieldsForm.submit}>
				<FormMessage error={fieldsResult?.error} success={fieldsResult?.success} />
				<FieldInputs
					fields={data.fields}
					values={data.fieldValues}
					errors={fieldsResult?.errors ?? {}}
				/>
				<Button type="submit" loading={fieldsForm.pending}>{i18n.t('common.save')}</Button>
			</form>
		</Card>
	{/if}

	<p class="text-sm text-ink-muted">{i18n.t('admin.people.passwordHint')}</p>
</div>
