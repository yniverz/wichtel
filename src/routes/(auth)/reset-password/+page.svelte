<script lang="ts">
	import { enhance } from '$app/forms';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Field from '#lib/components/Field.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const submitter = pendingForm();
</script>

<h1 class="font-display text-5xl uppercase">{i18n.t('auth.reset.title')}</h1>

{#if !data.valid}
	<div class="mt-6 space-y-4">
		<Alert tone="error">{i18n.t('error.invalidToken')}</Alert>
		<Button href="/forgot-password" variant="secondary" block>{i18n.t('auth.forgot.title')}</Button>
	</div>
{:else}
	<form method="POST" class="mt-6 space-y-4" use:enhance={submitter.submit}>
		<FormMessage error={form && 'error' in form ? form.error : undefined} />
		<input type="hidden" name="token" value={data.token} />
		<Field
			label={i18n.t('field.newPassword')}
			name="password"
			type="password"
			autocomplete="new-password"
			minlength={10}
			hint={i18n.t('auth.register.passwordHint')}
			error={form?.errors?.password}
		/>
		<Button type="submit" block size="lg" loading={submitter.pending}
			>{i18n.t('auth.reset.submit')}</Button
		>
	</form>
{/if}
