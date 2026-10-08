<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Field from '#lib/components/Field.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	const i18n = getI18n();
	const submitter = pendingForm();
	const notice = $derived(page.url.searchParams.get('notice'));
</script>

<svelte:head
	><title>{i18n.t('auth.login.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<h1 class="font-display text-5xl uppercase">{i18n.t('auth.login.title')}</h1>

<form method="POST" class="mt-6 space-y-4" use:enhance={submitter.submit}>
	{#if notice === 'reset'}
		<Alert tone="success">{i18n.t('auth.reset.success')}</Alert>
	{:else if notice === 'deleted'}
		<Alert tone="success">{i18n.t('privacy.deleted')}</Alert>
	{/if}
	<FormMessage error={form?.error} />
	<Field
		label={i18n.t('field.email')}
		name="email"
		type="email"
		autocomplete="email"
		value={form?.values?.email ?? ''}
		error={form?.errors?.email}
	/>
	<div class="space-y-1.5">
		<Field
			label={i18n.t('field.password')}
			name="password"
			type="password"
			autocomplete="current-password"
			error={form?.errors?.password}
		/>
		<a href="/forgot-password" class="inline-block text-sm text-brand-text hover:underline"
			>{i18n.t('auth.login.forgot')}</a
		>
	</div>
	<Button type="submit" block size="lg" loading={submitter.pending}
		>{i18n.t('auth.login.submit')}</Button
	>
</form>

{#if page.data.settings.registrationOpen}
	<p class="mt-6 text-center text-sm text-ink-muted">
		{i18n.t('auth.login.noAccount')}
		<a href="/register" class="font-semibold text-brand-text hover:underline"
			>{i18n.t('nav.register')}</a
		>
	</p>
{/if}
