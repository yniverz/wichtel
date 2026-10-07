<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import ConfirmForm from '#lib/components/ConfirmForm.svelte';
	import Field from '#lib/components/Field.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { LOCALES } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const profileForm = pendingForm({ reset: false });
	const passwordForm = pendingForm();
	let copied = $state(false);

	type Result = {
		action?: string;
		error?: string;
		success?: string;
		errors?: Record<string, string>;
		values?: Record<string, string>;
	};
	const result = $derived(form as Result | null);
	const profileResult = $derived(result?.action === 'profile' ? result : null);
	const passwordResult = $derived(result?.action === 'password' ? result : null);
	const values = $derived({ ...data.profile, ...(profileResult?.values ?? {}) });
</script>

<svelte:head
	><title>{i18n.t('profile.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<div class="mx-auto max-w-2xl space-y-6">
	<div class="border-b border-ink pb-4">
		<h1 class="font-display text-5xl uppercase">{i18n.t('profile.title')}</h1>
		<p class="mt-2 text-ink-muted">
			{i18n.t('profile.emailInfo', { email: page.data.user?.email ?? '' })}
		</p>
	</div>

	<Card title={i18n.t('profile.personal')}>
		<form method="POST" action="?/profile" class="space-y-4" use:enhance={profileForm.submit}>
			<FormMessage error={profileResult?.error} success={profileResult?.success} />
			<div class="grid gap-4 sm:grid-cols-2">
				<Field
					label={i18n.t('field.firstName')}
					name="firstName"
					autocomplete="given-name"
					value={values.firstName}
					error={profileResult?.errors?.firstName}
				/>
				<Field
					label={i18n.t('field.lastName')}
					name="lastName"
					autocomplete="family-name"
					value={values.lastName}
					error={profileResult?.errors?.lastName}
				/>
			</div>
			<Field
				label={i18n.t('field.phone')}
				name="phone"
				type="tel"
				autocomplete="tel"
				hint={i18n.t('field.phoneHint')}
				value={values.phone}
				error={profileResult?.errors?.phone}
			/>
			<div class="space-y-1.5">
				<label for="locale" class="text-sm font-medium">{i18n.t('field.locale')}</label>
				<select id="locale" name="locale" class="block h-11 w-full" value={values.locale}>
					{#each LOCALES as l (l)}<option value={l}>{i18n.t(`locale.${l}`)}</option>{/each}
				</select>
			</div>
			<Button type="submit" loading={profileForm.pending}>{i18n.t('common.save')}</Button>
		</form>
	</Card>

	<Card title={i18n.t('profile.password')}>
		<form method="POST" action="?/password" class="space-y-4" use:enhance={passwordForm.submit}>
			<FormMessage error={passwordResult?.error} success={passwordResult?.success} />
			<Field
				label={i18n.t('field.currentPassword')}
				name="currentPassword"
				type="password"
				autocomplete="current-password"
				error={passwordResult?.errors?.currentPassword}
			/>
			<Field
				label={i18n.t('field.newPassword')}
				name="newPassword"
				type="password"
				autocomplete="new-password"
				minlength={10}
				hint={i18n.t('auth.register.passwordHint')}
				error={passwordResult?.errors?.newPassword}
			/>
			<Button type="submit" variant="secondary" loading={passwordForm.pending}
				>{i18n.t('profile.passwordSubmit')}</Button
			>
		</form>
	</Card>

	<Card title={i18n.t('calendar.title')} description={i18n.t('calendar.lead')}>
		<div class="flex flex-wrap gap-2">
			<Button href={data.calendarUrl.replace(/^https?:/, 'webcal:')}
				>{i18n.t('calendar.subscribe')}</Button
			>
			<Button
				variant="secondary"
				onclick={async () => {
					await navigator.clipboard.writeText(data.calendarUrl);
					copied = true;
					setTimeout(() => (copied = false), 2000);
				}}>{copied ? i18n.t('calendar.copied') : i18n.t('calendar.copy')}</Button
			>
			<ConfirmForm
				action="?/rotateCalendar"
				variant="ghost"
				message={i18n.t('calendar.rotateConfirm')}
				confirmLabel={i18n.t('calendar.rotate')}
			>
				{i18n.t('calendar.rotate')}
			</ConfirmForm>
		</div>
	</Card>

	<form method="POST" action="/logout" class="md:hidden">
		<Button type="submit" variant="secondary" block>{i18n.t('nav.logout')}</Button>
	</form>
</div>
