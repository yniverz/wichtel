<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import ConfirmForm from '#lib/components/ConfirmForm.svelte';
	import Field from '#lib/components/Field.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { localized, type MessageKey } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	type Result = {
		preview?: number;
		sent?: number;
		error?: string;
		errors?: Record<string, string>;
		values?: Record<string, string>;
	};
	const result = $derived(form as Result | null);
	const v = $derived(result?.sent !== undefined ? {} : (result?.values ?? {}));
	// svelte-ignore state_referenced_locally
	let kind = $state(data.shift ? 'shift' : data.areas.length ? 'area' : 'helpers');
	const previewForm = pendingForm({ reset: false });
	let edited = $state(false);
	const kinds = $derived(
		(['shift', 'area', 'helpers', 'crew', 'everyone'] as const).filter((k) =>
			k === 'shift' ? data.shift !== null : k === 'area' ? data.areas.length > 0 : data.kinds[k]
		)
	);
</script>

<svelte:head
	><title>{i18n.t('admin.mail.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader title={i18n.t('admin.mail.title')} lead={i18n.t('admin.mail.lead')} />

{#if result?.sent !== undefined}
	<div class="mb-6 max-w-2xl">
		<Alert tone="success">{i18n.t('admin.mail.sent', { count: result.sent })}</Alert>
	</div>
{/if}

<form
	method="POST"
	action="?/preview"
	class="max-w-2xl space-y-6"
	oninput={() => (edited = true)}
	use:enhance={(input) => {
		edited = false;
		return previewForm.submit(input);
	}}
>
	<FormMessage error={result?.error} />
	<fieldset class="space-y-2">
		<legend class="text-sm font-medium">{i18n.t('admin.mail.audience')}</legend>
		{#each kinds as k (k)}
			<label class="flex items-center gap-3 text-sm">
				<input
					type="radio"
					name="kind"
					value={k}
					bind:group={kind}
					class="size-4 border-ink/40 text-brand focus:ring-brand"
				/>
				{i18n.t(`admin.mail.audience.${k}` as MessageKey)}{#if k === 'shift' && data.shift}: <strong
						>{localized(data.shift, 'title', i18n.locale)}</strong
					>{/if}
			</label>
		{/each}
		{#if data.shift}<input type="hidden" name="shiftId" value={data.shift.id} />{/if}
		{#if kind === 'area'}
			<div class="ml-7 max-w-sm">
				<label class="sr-only" for="areaId">{i18n.t('admin.mail.area')}</label>
				<select
					id="areaId"
					name="areaId"
					class="block h-10 w-full text-sm"
					value={v.areaId ?? data.areas[0]?.id}
				>
					{#each data.areas as a (a.id)}
						<option value={a.id}
							>{'  '.repeat(a.depth)}{a.depth ? '└ ' : ''}{localized(
								a,
								'name',
								i18n.locale
							)}</option
						>
					{/each}
				</select>
			</div>
		{/if}
	</fieldset>

	<Field
		label={i18n.t('admin.mail.subjectDe')}
		name="subjectDe"
		value={v.subjectDe ?? ''}
		error={result?.errors?.subjectDe}
	/>
	<div class="space-y-1.5">
		<label for="bodyDe" class="text-sm font-medium">{i18n.t('admin.mail.bodyDe')}</label>
		<textarea id="bodyDe" name="bodyDe" rows="8" required class="block w-full"
			>{v.bodyDe ?? ''}</textarea
		>
		<p class="text-sm text-ink-muted">{i18n.t('admin.mail.placeholders')}</p>
	</div>
	<details class="space-y-3" open={Boolean(v.subjectEn || v.bodyEn)}>
		<summary class="cursor-pointer text-sm font-semibold"
			>{i18n.t('admin.mail.subjectEn')} / {i18n.t('admin.mail.bodyEn')}</summary
		>
		<p class="text-sm text-ink-muted">{i18n.t('admin.mail.englishHint')}</p>
		<Field
			label={i18n.t('admin.mail.subjectEn')}
			name="subjectEn"
			optional
			value={v.subjectEn ?? ''}
		/>
		<div class="space-y-1.5">
			<label for="bodyEn" class="text-sm font-medium">{i18n.t('admin.mail.bodyEn')}</label>
			<textarea id="bodyEn" name="bodyEn" rows="8" class="block w-full">{v.bodyEn ?? ''}</textarea>
		</div>
	</details>

	<Button type="submit" variant="secondary" loading={previewForm.pending}
		>{i18n.t('admin.mail.preview')}</Button
	>
</form>

<!-- The send button only appears for exactly the text that was counted. -->
{#if result?.preview !== undefined && result.values && !edited}
	<div class="mt-6 flex max-w-2xl flex-wrap items-center gap-4 border-t-2 border-ink pt-4">
		<p class="font-display text-3xl tabular-nums">
			{i18n.t('admin.mail.recipients', { count: result.preview })}
		</p>
		{#if result.preview > 0}
			<ConfirmForm
				action="?/send"
				hidden={result.values}
				variant="primary"
				size="md"
				message={i18n.t('admin.mail.sendConfirm', { count: result.preview })}
				confirmLabel={i18n.t('admin.mail.send')}
			>
				{i18n.t('admin.mail.send')}
			</ConfirmForm>
		{:else}
			<p class="text-ink-muted">{i18n.t('admin.mail.none')}</p>
		{/if}
	</div>
{/if}
