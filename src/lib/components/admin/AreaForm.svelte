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
		cancelDeadlineHours: string | number | null;
		pointsPerShift: string | number | null;
		pointsPerHour: string | number | null;
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

	<div class="grid gap-4 sm:grid-cols-2">
		<Field
			label={i18n.t('admin.areas.sortOrder')}
			name="sortOrder"
			type="number"
			value={String(values.sortOrder)}
			hint={i18n.t('admin.areas.sortOrderHint')}
			error={result?.errors?.sortOrder}
		/>
		<Field
			label={i18n.t('admin.areas.cancelDeadline')}
			name="cancelDeadlineHours"
			type="number"
			min="0"
			optional
			value={values.cancelDeadlineHours === null ? '' : String(values.cancelDeadlineHours)}
			hint={i18n.t('admin.areas.cancelDeadlineHint')}
			error={result?.errors?.cancelDeadlineHours}
		/>
	</div>

	<fieldset class="space-y-2">
		<legend class="mb-1 w-full border-b border-ink pb-1 text-sm font-bold">
			{i18n.t('admin.points.title')}
		</legend>
		<p class="text-sm text-ink-muted">{i18n.t('admin.areas.pointsHint')}</p>
		<div class="grid gap-4 sm:grid-cols-2">
			<Field
				label={i18n.t('admin.points.perShift')}
				name="pointsPerShift"
				type="number"
				min="0"
				optional
				value={values.pointsPerShift === null ? '' : String(values.pointsPerShift)}
				error={result?.errors?.pointsPerShift}
			/>
			<Field
				label={i18n.t('admin.points.perHour')}
				name="pointsPerHour"
				type="number"
				min="0"
				optional
				value={values.pointsPerHour === null ? '' : String(values.pointsPerHour)}
				error={result?.errors?.pointsPerHour}
			/>
		</div>
	</fieldset>

	<Button type="submit" loading={submitter.pending}>{submitLabel}</Button>
</form>
