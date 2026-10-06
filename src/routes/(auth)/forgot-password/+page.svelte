<script lang="ts">
	import { enhance } from '$app/forms';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Field from '#lib/components/Field.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	const i18n = getI18n();
	const submitter = pendingForm({ reset: false });
</script>

<h1 class="font-display text-5xl uppercase">{i18n.t('auth.forgot.title')}</h1>

{#if form && 'sent' in form && form.sent}
	<div class="mt-6"><Alert tone="success">{i18n.t('auth.forgot.sent')}</Alert></div>
{:else}
	<p class="mt-3 text-ink-muted">{i18n.t('auth.forgot.lead')}</p>
	<form method="POST" class="mt-6 space-y-4" use:enhance={submitter.submit}>
		<FormMessage error={form && 'error' in form ? form.error : undefined} />
		<Field
			label={i18n.t('field.email')}
			name="email"
			type="email"
			autocomplete="email"
			value={form && 'values' in form ? (form.values?.email ?? '') : ''}
			error={form && 'errors' in form ? form.errors?.email : undefined}
		/>
		<Button type="submit" block size="lg" loading={submitter.pending}
			>{i18n.t('auth.forgot.submit')}</Button
		>
	</form>
{/if}

<p class="mt-6 text-center text-sm">
	<a href="/login" class="text-brand-text hover:underline">{i18n.t('auth.backToLogin')}</a>
</p>
