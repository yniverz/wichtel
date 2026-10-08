<script lang="ts">
	import { legalLinks } from '#lib/legal-links.ts';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Field from '#lib/components/Field.svelte';
	import FieldInputs from '#lib/components/FieldInputs.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const submitter = pendingForm({ reset: false });
	const settings = $derived(page.data.settings);
	const privacyLink = $derived(legalLinks(settings).privacy);
</script>

<svelte:head><title>{i18n.t('auth.register.title')} · {settings.festivalName}</title></svelte:head>

<h1 class="font-display text-5xl uppercase">{i18n.t('auth.register.title')}</h1>

{#if !settings.registrationOpen}
	<div class="mt-6"><Alert tone="info">{i18n.t('auth.register.closed')}</Alert></div>
{:else}
	<p class="mt-3 text-ink-muted">{i18n.t('auth.register.lead')}</p>

	<form method="POST" class="mt-6 space-y-4" use:enhance={submitter.submit}>
		<FormMessage error={form?.error} />
		<div class="grid gap-4 sm:grid-cols-2">
			<Field
				label={i18n.t('field.firstName')}
				name="firstName"
				autocomplete="given-name"
				value={form?.values?.firstName ?? ''}
				error={form?.errors?.firstName}
			/>
			<Field
				label={i18n.t('field.lastName')}
				name="lastName"
				autocomplete="family-name"
				value={form?.values?.lastName ?? ''}
				error={form?.errors?.lastName}
			/>
		</div>
		<Field
			label={i18n.t('field.email')}
			name="email"
			type="email"
			autocomplete="email"
			value={form?.values?.email ?? ''}
			error={form?.errors?.email}
		/>
		<Field
			label={i18n.t('field.phone')}
			name="phone"
			type="tel"
			autocomplete="tel"
			hint={i18n.t('field.phoneHint')}
			value={form?.values?.phone ?? ''}
			error={form?.errors?.phone}
		/>
		<Field
			label={i18n.t('field.password')}
			name="password"
			type="password"
			autocomplete="new-password"
			minlength={10}
			hint={i18n.t('auth.register.passwordHint')}
			error={form?.errors?.password}
		/>
		{#if data.fields.length}
			<FieldInputs
				fields={data.fields}
				values={form?.fieldValues ?? {}}
				errors={form?.errors ?? {}}
			/>
		{/if}
		{#if privacyLink}
			<p class="text-sm text-ink-muted">
				{i18n.t('auth.register.privacy')}
				<a href={privacyLink} target="_blank" rel="noopener" class="text-brand-text underline"
					>{i18n.t('auth.register.privacyLink')}</a
				>.
			</p>
		{/if}
		<Button type="submit" block size="lg" loading={submitter.pending}
			>{i18n.t('auth.register.submit')}</Button
		>
	</form>
{/if}

<p class="mt-6 text-center text-sm text-ink-muted">
	{i18n.t('auth.register.haveAccount')}
	<a href="/login" class="font-semibold text-brand-text hover:underline">{i18n.t('nav.login')}</a>
</p>
