<script lang="ts">
	import Field from '#lib/components/Field.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import ShiftForm from '#lib/components/admin/ShiftForm.svelte';
	import type { EditablePosition } from '#lib/components/admin/PositionsEditor.svelte';
	import { expandSeries, MAX_SERIES_SHIFTS } from '#lib/domain/booking.ts';
	import { isIsoDate, isWallTime } from '#lib/domain/time.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { MessageKey } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	type Echo = {
		values?: Record<string, string>;
		positions?: string;
		slots?: string;
		weekdays?: string[];
		errors?: Record<string, string>;
		error?: string;
	};
	const echo = $derived(form as Echo | null);
	const values = $derived({ ...data.values, ...(echo?.values ?? {}) });
	const parse = <T,>(raw: string | undefined, fallback: T): T => {
		try {
			return raw ? (JSON.parse(raw) as T) : fallback;
		} catch {
			return fallback;
		}
	};
	const positions = $derived(parse<EditablePosition[]>(echo?.positions, data.positions));

	// Local editing state, initialised once; after a failed submit the inputs keep what was entered.
	// svelte-ignore state_referenced_locally
	let from = $state(data.edition.startsOn);
	// svelte-ignore state_referenced_locally
	let to = $state(data.edition.endsOn);
	let weekdays = $state<number[]>([0, 1, 2, 3, 4, 5, 6]);
	let slots = $state<{ start: string; end: string }[]>([{ start: '10:00', end: '14:00' }]);

	// Monday first in German, Sunday first in English
	const order = $derived(i18n.locale === 'de' ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6]);
	const count = $derived.by(() => {
		if (
			!isIsoDate(from) ||
			!isIsoDate(to) ||
			slots.some((s) => !isWallTime(s.start) || !isWallTime(s.end))
		)
			return 0;
		return expandSeries({ from, to, weekdays, slots, timeZone: data.timezone }).length;
	});
	function toggleDay(d: number) {
		weekdays = weekdays.includes(d) ? weekdays.filter((x) => x !== d) : [...weekdays, d];
	}
</script>

<PageHeader
	title={i18n.t('admin.shifts.series')}
	lead={i18n.t('admin.shifts.series.lead')}
	back={{ href: '/admin/shifts', label: i18n.t('admin.shifts.title') }}
/>

<ShiftForm
	action=""
	{values}
	{positions}
	areas={data.areas}
	qualifications={data.qualifications}
	result={echo}
	submitLabel={i18n.t('admin.shifts.series.submit')}
>
	{#snippet schedule()}
		<fieldset class="space-y-5">
			<legend class="mb-1 w-full border-b border-ink pb-1 text-sm font-bold"
				>{i18n.t('admin.shifts.date')}</legend
			>
			<div class="grid gap-4 sm:grid-cols-2">
				<Field
					label={i18n.t('admin.shifts.series.from')}
					name="from"
					type="date"
					bind:value={from}
					min={data.edition.startsOn}
					max={data.edition.endsOn}
					error={echo?.errors?.from}
				/>
				<Field
					label={i18n.t('admin.shifts.series.to')}
					name="to"
					type="date"
					bind:value={to}
					min={from}
					max={data.edition.endsOn}
					error={echo?.errors?.to}
				/>
			</div>

			<div>
				<p class="mb-2 text-sm font-medium">{i18n.t('admin.shifts.series.weekdays')}</p>
				<div class="flex flex-wrap gap-1.5">
					{#each order as d (d)}
						<label class="cursor-pointer">
							<input
								type="checkbox"
								name="weekdays[]"
								value={d}
								checked={weekdays.includes(d)}
								onchange={() => toggleDay(d)}
								class="peer sr-only"
							/>
							<span
								class="inline-flex h-10 w-12 items-center justify-center rounded-md border border-ink/25 text-sm font-semibold peer-checked:border-ink peer-checked:bg-ink peer-checked:text-surface peer-focus-visible:outline-2 peer-focus-visible:outline-brand"
							>
								{i18n.t(`weekday.${d}` as MessageKey)}
							</span>
						</label>
					{/each}
				</div>
			</div>

			<div>
				<p class="mb-2 text-sm font-medium">{i18n.t('admin.shifts.series.slots')}</p>
				<input type="hidden" name="slots" value={JSON.stringify(slots)} />
				<ul class="space-y-2">
					{#each slots as slot, i (i)}
						<li class="flex items-center gap-2">
							<input
								type="time"
								aria-label={i18n.t('admin.shifts.start')}
								bind:value={slot.start}
								class="h-10 w-32 tabular-nums"
								required
							/>
							<span aria-hidden="true">–</span>
							<input
								type="time"
								aria-label={i18n.t('admin.shifts.end')}
								bind:value={slot.end}
								class="h-10 w-32 tabular-nums"
								required
							/>
							{#if slots.length > 1}
								<button
									type="button"
									class="h-10 rounded-md px-2 text-sm text-ink-muted hover:bg-ink/6"
									aria-label={i18n.t('admin.shifts.series.removeSlot')}
									onclick={() => slots.splice(i, 1)}>✕</button
								>
							{/if}
						</li>
					{/each}
				</ul>
				<button
					type="button"
					class="mt-2 text-sm font-semibold text-brand-text hover:underline"
					onclick={() => slots.push({ start: slots.at(-1)?.end ?? '10:00', end: '' })}
				>
					+ {i18n.t('admin.shifts.series.addSlot')}
				</button>
				<p class="mt-2 text-sm text-ink-muted">{i18n.t('admin.shifts.endHint')}</p>
			</div>

			<p
				class="font-display text-2xl tabular-nums {count > MAX_SERIES_SHIFTS ? 'text-red-700' : ''}"
				aria-live="polite"
			>
				{i18n.t('admin.shifts.series.preview', { count })}
			</p>
		</fieldset>
	{/snippet}
</ShiftForm>
