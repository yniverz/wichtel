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
	const submitter = pendingForm({ reset: false });
	const v = $derived(form?.values ?? {});
	const e = $derived(form?.errors ?? {});
	const year = new Date().getFullYear() + 1;
</script>

<h1 class="font-display text-5xl uppercase">{i18n.t('setup.title')}</h1>

{#if !data.valid}
	<div class="mt-6"><Alert tone="error">{i18n.t('setup.invalidToken')}</Alert></div>
{:else}
	<p class="mt-3 text-ink-muted">{i18n.t('setup.lead')}</p>
	<form method="POST" class="mt-6 space-y-8" use:enhance={submitter.submit}>
		<FormMessage error={form?.error} />
		<input type="hidden" name="token" value={data.token} />

		<fieldset class="space-y-4">
			<legend class="mb-3 w-full border-b border-ink pb-1 text-sm font-bold"
				>{i18n.t('setup.festival')}</legend
			>
			<Field
				label={i18n.t('setup.festivalName')}
				name="festivalName"
				value={v.festivalName ?? ''}
				error={e.festivalName}
			/>
		</fieldset>

		<fieldset class="space-y-4">
			<legend class="mb-3 w-full border-b border-ink pb-1 text-sm font-bold"
				>{i18n.t('setup.admin')}</legend
			>
			<div class="grid gap-4 sm:grid-cols-2">
				<Field
					label={i18n.t('field.firstName')}
					name="firstName"
					autocomplete="given-name"
					value={v.firstName ?? ''}
					error={e.firstName}
				/>
				<Field
					label={i18n.t('field.lastName')}
					name="lastName"
					autocomplete="family-name"
					value={v.lastName ?? ''}
					error={e.lastName}
				/>
			</div>
			<Field
				label={i18n.t('field.email')}
				name="email"
				type="email"
				autocomplete="email"
				value={v.email ?? ''}
				error={e.email}
			/>
			<Field
				label={i18n.t('field.phone')}
				name="phone"
				type="tel"
				autocomplete="tel"
				value={v.phone ?? ''}
				error={e.phone}
			/>
			<Field
				label={i18n.t('field.password')}
				name="password"
				type="password"
				autocomplete="new-password"
				minlength={10}
				hint={i18n.t('auth.register.passwordHint')}
				error={e.password}
			/>
		</fieldset>

		<fieldset class="space-y-4">
			<legend class="mb-1 w-full border-b border-ink pb-1 text-sm font-bold"
				>{i18n.t('setup.edition')}</legend
			>
			<p class="text-sm text-ink-muted">{i18n.t('setup.editionHint')}</p>
			<Field
				label={i18n.t('admin.editions.name')}
				name="editionName"
				placeholder={i18n.t('admin.editions.namePlaceholder')}
				value={v.editionName ?? `${v.festivalName ?? 'Festival'} ${year}`}
				error={e.editionName}
			/>
			<div class="grid gap-4 sm:grid-cols-2">
				<Field
					label={i18n.t('admin.editions.startsOn')}
					name="startsOn"
					type="date"
					value={v.startsOn ?? ''}
					error={e.startsOn}
				/>
				<Field
					label={i18n.t('admin.editions.endsOn')}
					name="endsOn"
					type="date"
					value={v.endsOn ?? ''}
					error={e.endsOn}
				/>
			</div>
		</fieldset>

		<Button type="submit" block size="lg" loading={submitter.pending}
			>{i18n.t('setup.submit')}</Button
		>
	</form>
{/if}
