<script lang="ts" module>
	export interface ShiftFormValues {
		areaId: string;
		titleDe: string;
		titleEn: string;
		descriptionDe: string;
		descriptionEn: string;
		location: string;
		meetingPoint: string;
		contact: string;
		visibility: string;
		cancelDeadlineHours: string | number | null;
		date?: string;
		start?: string;
		end?: string;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import Button from '#lib/components/Button.svelte';
	import Field from '#lib/components/Field.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { localized } from '#lib/i18n/index.ts';
	import PositionsEditor, { type EditablePosition } from './PositionsEditor.svelte';

	let {
		action,
		values,
		positions,
		areas,
		qualifications = [],
		result,
		submitLabel,
		schedule
	}: {
		action: string;
		values: ShiftFormValues;
		positions: EditablePosition[];
		areas: { id: string; nameDe: string; nameEn: string; depth: number }[];
		qualifications?: { id: string; nameDe: string; nameEn: string }[];
		result?: { error?: string; success?: string; errors?: Record<string, string> } | null;
		submitLabel: string;
		/** Replaces the single date/time fields (used by the series form). */
		schedule?: Snippet;
	} = $props();

	const i18n = getI18n();
	const submitter = pendingForm({ reset: false });
	const e = $derived(result?.errors ?? {});
</script>

<form method="POST" {action} class="space-y-8" use:enhance={submitter.submit}>
	<FormMessage error={result?.error} success={result?.success} />

	<fieldset class="space-y-4">
		<legend class="mb-1 w-full border-b border-ink pb-1 text-sm font-bold"
			>{i18n.t('admin.shifts.details')}</legend
		>
		<div class="space-y-1.5">
			<label for="areaId" class="text-sm font-medium">{i18n.t('admin.shifts.area')}</label>
			<select id="areaId" name="areaId" class="block h-11 w-full" value={values.areaId} required>
				{#each areas as a (a.id)}
					<option value={a.id}
						>{'  '.repeat(a.depth)}{a.depth ? '└ ' : ''}{localized(a, 'name', i18n.locale)}</option
					>
				{/each}
			</select>
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			<Field
				label={i18n.t('admin.shifts.titleDe')}
				name="titleDe"
				value={values.titleDe}
				error={e.titleDe}
			/>
			<Field
				label={i18n.t('admin.shifts.titleEn')}
				name="titleEn"
				optional
				value={values.titleEn}
				error={e.titleEn}
			/>
		</div>
	</fieldset>

	{#if schedule}
		{@render schedule()}
	{:else}
		<fieldset class="space-y-2">
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-[2fr_1fr_1fr]">
				<div class="col-span-2 sm:col-span-1">
					<Field
						label={i18n.t('admin.shifts.date')}
						name="date"
						type="date"
						value={values.date ?? ''}
						error={e.date}
					/>
				</div>
				<Field
					label={i18n.t('admin.shifts.start')}
					name="start"
					type="time"
					value={values.start ?? ''}
					error={e.start}
				/>
				<Field
					label={i18n.t('admin.shifts.end')}
					name="end"
					type="time"
					value={values.end ?? ''}
					error={e.end}
				/>
			</div>
			<p class="text-sm text-ink-muted">{i18n.t('admin.shifts.endHint')}</p>
		</fieldset>
	{/if}

	{#key JSON.stringify(positions)}
		<PositionsEditor initial={positions} error={e.positions} {qualifications} />
	{/key}

	<fieldset class="space-y-4">
		<legend class="mb-1 w-full border-b border-ink pb-1 text-sm font-bold"
			>{i18n.t('shifts.location')}</legend
		>
		<div class="grid gap-4 sm:grid-cols-2">
			<Field
				label={i18n.t('admin.shifts.location')}
				name="location"
				optional
				value={values.location}
			/>
			<Field
				label={i18n.t('admin.shifts.meetingPoint')}
				name="meetingPoint"
				optional
				value={values.meetingPoint}
			/>
		</div>
		<Field
			label={i18n.t('admin.shifts.contact')}
			name="contact"
			optional
			hint={i18n.t('admin.shifts.contactHint')}
			value={values.contact}
		/>
		<div class="grid gap-4 sm:grid-cols-2">
			{#each [{ name: 'descriptionDe', label: 'admin.shifts.descriptionDe' }, { name: 'descriptionEn', label: 'admin.shifts.descriptionEn' }] as const as d (d.name)}
				<div class="space-y-1.5">
					<label for={d.name} class="flex justify-between text-sm font-medium"
						>{i18n.t(d.label)}<span class="text-xs font-normal text-ink-muted"
							>{i18n.t('common.optional')}</span
						></label
					>
					<textarea id={d.name} name={d.name} rows="3" class="block w-full"
						>{values[d.name]}</textarea
					>
				</div>
			{/each}
		</div>
	</fieldset>

	<fieldset class="space-y-4">
		<legend class="mb-1 w-full border-b border-ink pb-1 text-sm font-bold"
			>{i18n.t('admin.settings.booking')}</legend
		>
		<div class="space-y-2">
			<p class="text-sm font-medium">{i18n.t('admin.shifts.visibility')}</p>
			{#each ['public', 'internal'] as const as vis (vis)}
				<label class="flex items-center gap-3 text-sm">
					<input
						type="radio"
						name="visibility"
						value={vis}
						checked={values.visibility === vis}
						class="size-4 border-ink/40 text-brand focus:ring-brand"
					/>
					{i18n.t(`admin.shifts.visibility.${vis}`)}
				</label>
			{/each}
		</div>
		<div class="max-w-xs">
			<Field
				label={i18n.t('admin.shifts.cancelDeadline')}
				name="cancelDeadlineHours"
				type="number"
				min="0"
				optional
				value={values.cancelDeadlineHours === null ? '' : String(values.cancelDeadlineHours)}
				hint={i18n.t('admin.shifts.cancelDeadlineHint')}
				error={e.cancelDeadlineHours}
			/>
		</div>
	</fieldset>

	<Button type="submit" size="lg" loading={submitter.pending}>{submitLabel}</Button>
</form>
