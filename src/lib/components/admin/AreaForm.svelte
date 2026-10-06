<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '#lib/components/Button.svelte';
	import Field from '#lib/components/Field.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';

	type Values = {
		parentId: string;
		nameDe: string;
		nameEn: string;
		descriptionDe: string;
		descriptionEn: string;
		sortOrder: string | number;
	};

	let {
		action,
		values,
		parents,
		allowRoot,
		result,
		submitLabel
	}: {
		action: string;
		values: Values;
		parents: { id: string; label: string; depth: number }[];
		allowRoot: boolean;
		result?: { error?: string; success?: string; errors?: Record<string, string> } | null;
		submitLabel: string;
	} = $props();

	const i18n = getI18n();
	const submitter = pendingForm({ reset: false });
</script>

<form method="POST" {action} class="space-y-5" use:enhance={submitter.submit}>
	<FormMessage error={result?.error} success={result?.success} />

	<div class="space-y-1.5">
		<label for="parentId" class="text-sm font-medium">{i18n.t('admin.areas.parent')}</label>
		<select id="parentId" name="parentId" class="block h-11 w-full" value={values.parentId}>
			{#if allowRoot}<option value="">{i18n.t('admin.areas.parentNone')}</option>{/if}
			{#each parents as p (p.id)}
				<option value={p.id}>{'  '.repeat(p.depth)}{p.depth > 0 ? '└ ' : ''}{p.label}</option>
			{/each}
		</select>
		{#if result?.errors?.parentId}<p class="text-sm text-red-600">
				{i18n.t(result.errors.parentId as never)}
			</p>{/if}
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<Field
			label={i18n.t('admin.areas.nameDe')}
			name="nameDe"
			value={values.nameDe}
			error={result?.errors?.nameDe}
		/>
		<Field
			label={i18n.t('admin.areas.nameEn')}
			name="nameEn"
			optional
			value={values.nameEn}
			error={result?.errors?.nameEn}
		/>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-1.5">
			<label for="descriptionDe" class="flex justify-between text-sm font-medium"
				>{i18n.t('admin.areas.descriptionDe')}<span class="text-xs font-normal text-ink-muted"
					>{i18n.t('common.optional')}</span
				></label
			>
			<textarea id="descriptionDe" name="descriptionDe" rows="3" class="block w-full"
				>{values.descriptionDe}</textarea
			>
		</div>
		<div class="space-y-1.5">
			<label for="descriptionEn" class="flex justify-between text-sm font-medium"
				>{i18n.t('admin.areas.descriptionEn')}<span class="text-xs font-normal text-ink-muted"
					>{i18n.t('common.optional')}</span
				></label
			>
			<textarea id="descriptionEn" name="descriptionEn" rows="3" class="block w-full"
				>{values.descriptionEn}</textarea
			>
		</div>
	</div>

	<div class="max-w-40">
		<Field
			label={i18n.t('admin.areas.sortOrder')}
			name="sortOrder"
			type="number"
			value={String(values.sortOrder)}
			hint={i18n.t('admin.areas.sortOrderHint')}
			error={result?.errors?.sortOrder}
		/>
	</div>

	<Button type="submit" loading={submitter.pending}>{submitLabel}</Button>
</form>
