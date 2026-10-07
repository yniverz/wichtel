<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '#lib/components/Button.svelte';
	import Field from '#lib/components/Field.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';

	let {
		values,
		result,
		submitLabel
	}: {
		values: {
			id?: string;
			nameDe: string;
			nameEn: string;
			descriptionDe: string;
			descriptionEn: string;
			proof: string;
			documentRetention: string;
			validityDays: number | null;
			active: boolean;
			sortOrder: number;
		};
		result?: { error?: string; success?: string; errors?: Record<string, string> } | null;
		submitLabel: string;
	} = $props();
	const i18n = getI18n();
	// The "new" form is cleared after saving; edit forms keep their values.
	// svelte-ignore state_referenced_locally
	const submitter = pendingForm({ reset: !values.id });
	const e = $derived(result?.errors ?? {});
</script>

<form method="POST" action="?/save" class="space-y-4" use:enhance={submitter.submit}>
	<FormMessage error={result?.error} success={result?.success} />
	{#if values.id}<input type="hidden" name="id" value={values.id} />{/if}
	<div class="grid gap-4 sm:grid-cols-2">
		<Field
			label={i18n.t('admin.quals.nameDe')}
			name="nameDe"
			value={values.nameDe}
			error={e.nameDe}
		/>
		<Field label={i18n.t('admin.quals.nameEn')} name="nameEn" optional value={values.nameEn} />
		<Field
			label={i18n.t('admin.quals.descriptionDe')}
			name="descriptionDe"
			optional
			value={values.descriptionDe}
		/>
		<Field
			label={i18n.t('admin.quals.descriptionEn')}
			name="descriptionEn"
			optional
			value={values.descriptionEn}
		/>
	</div>
	<div class="grid gap-4 sm:grid-cols-3">
		<div class="space-y-1.5">
			<label class="text-sm font-medium" for="proof-{values.id ?? 'new'}"
				>{i18n.t('admin.quals.proof')}</label
			>
			<select
				id="proof-{values.id ?? 'new'}"
				name="proof"
				class="block h-11 w-full"
				value={values.proof}
			>
				<option value="either">{i18n.t('admin.quals.proof.either')}</option>
				<option value="confirm">{i18n.t('admin.quals.proof.confirm')}</option>
				<option value="upload">{i18n.t('admin.quals.proof.upload')}</option>
			</select>
		</div>
		<div class="space-y-1.5">
			<label class="text-sm font-medium" for="ret-{values.id ?? 'new'}"
				>{i18n.t('admin.quals.retention')}</label
			>
			<select
				id="ret-{values.id ?? 'new'}"
				name="documentRetention"
				class="block h-11 w-full"
				value={values.documentRetention}
			>
				<option value="delete_after_review"
					>{i18n.t('admin.quals.retention.delete_after_review')}</option
				>
				<option value="keep">{i18n.t('admin.quals.retention.keep')}</option>
			</select>
		</div>
		<Field
			id="valid-{values.id ?? 'new'}"
			label={i18n.t('admin.quals.validityDays')}
			name="validityDays"
			type="number"
			min="1"
			optional
			hint={i18n.t('admin.quals.validityHint')}
			value={values.validityDays === null ? '' : String(values.validityDays)}
			error={e.validityDays}
		/>
	</div>
	<div class="flex flex-wrap items-center gap-6">
		<label class="flex items-center gap-3 text-sm"
			><input type="checkbox" name="active" checked={values.active} class="size-4" />{i18n.t(
				'admin.quals.active'
			)}</label
		>
		<input type="hidden" name="sortOrder" value={values.sortOrder} />
		<Button type="submit" loading={submitter.pending}>{submitLabel}</Button>
	</div>
</form>
