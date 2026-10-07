<script lang="ts" module>
	export interface EditablePosition {
		id?: string;
		nameDe: string;
		nameEn: string;
		descriptionDe: string;
		descriptionEn: string;
		capacity: number;
		bookingMode: 'open' | 'request';
		/** Points override for this position; null = inherit from area/instance. */
		pointsPerShift?: number | null;
		requiredQualificationIds?: string[];
		preferredQualificationIds?: string[];
		/** Read-only info for existing positions. */
		booked?: number;
	}
</script>

<script lang="ts">
	import { getI18n } from '#lib/i18n/context.ts';
	import { localized } from '#lib/i18n/index.ts';

	let {
		initial,
		error,
		qualifications = []
	}: {
		initial: EditablePosition[];
		error?: string;
		qualifications?: { id: string; nameDe: string; nameEn: string }[];
	} = $props();

	function requirementOf(p: EditablePosition, id: string) {
		if (p.requiredQualificationIds?.includes(id)) return 'required';
		if (p.preferredQualificationIds?.includes(id)) return 'preferred';
		return '';
	}
	function setRequirement(p: EditablePosition, id: string, value: string) {
		p.requiredQualificationIds = (p.requiredQualificationIds ?? []).filter((x) => x !== id);
		p.preferredQualificationIds = (p.preferredQualificationIds ?? []).filter((x) => x !== id);
		if (value === 'required') p.requiredQualificationIds.push(id);
		if (value === 'preferred') p.preferredQualificationIds.push(id);
	}
	const i18n = getI18n();

	const blank = (): EditablePosition => ({
		nameDe: i18n.t('admin.shifts.position.default'),
		nameEn: '',
		descriptionDe: '',
		descriptionEn: '',
		capacity: 4,
		bookingMode: 'open'
	});

	// Local, deeply reactive editing state. The parent re-mounts this component (via {#key})
	// when it provides different initial data, e.g. after saving.
	// svelte-ignore state_referenced_locally
	let positions = $state<EditablePosition[]>(
		initial.length ? initial.map((p) => ({ ...p })) : [blank()]
	);
	const serialized = $derived(
		JSON.stringify(
			positions.map(({ booked: _booked, ...p }) => {
				void _booked;
				return p;
			})
		)
	);
</script>

<fieldset class="space-y-3">
	<legend class="mb-1 w-full border-b border-ink pb-1 text-sm font-bold"
		>{i18n.t('admin.shifts.positions')}</legend
	>
	<p class="text-sm text-ink-muted">{i18n.t('admin.shifts.positionsHint')}</p>
	<input type="hidden" name="positions" value={serialized} />

	{#each positions as position, i (i)}
		<div
			class="grid grid-cols-2 gap-3 rounded-md border border-line bg-surface-raised p-3 sm:grid-cols-[2fr_2fr_5rem_9rem_5rem_auto] sm:items-end"
		>
			<div class="col-span-2 space-y-1 sm:col-span-1">
				<label class="text-xs font-medium" for="pos-{i}-de"
					>{i18n.t('admin.shifts.position.name')}</label
				>
				<input
					id="pos-{i}-de"
					type="text"
					class="block h-10 w-full"
					bind:value={position.nameDe}
					required
					maxlength="100"
				/>
			</div>
			<div class="col-span-2 space-y-1 sm:col-span-1">
				<label class="text-xs font-medium" for="pos-{i}-en"
					>{i18n.t('admin.shifts.position.nameEn')}
					<span class="font-normal text-ink-muted">({i18n.t('common.optional')})</span></label
				>
				<input
					id="pos-{i}-en"
					type="text"
					class="block h-10 w-full"
					bind:value={position.nameEn}
					maxlength="100"
				/>
			</div>
			<div class="space-y-1">
				<label class="text-xs font-medium" for="pos-{i}-cap"
					>{i18n.t('admin.shifts.position.capacity')}</label
				>
				<input
					id="pos-{i}-cap"
					type="number"
					min={Math.max(1, position.booked ?? 0)}
					max="500"
					class="block h-10 w-full tabular-nums"
					bind:value={position.capacity}
					required
				/>
			</div>
			<div class="space-y-1">
				<label class="text-xs font-medium" for="pos-{i}-mode"
					>{i18n.t('admin.shifts.position.mode')}</label
				>
				<select id="pos-{i}-mode" class="block h-10 w-full" bind:value={position.bookingMode}>
					<option value="open">{i18n.t('admin.shifts.mode.open')}</option>
					<option value="request">{i18n.t('admin.shifts.mode.request')}</option>
				</select>
			</div>
			<div class="space-y-1">
				<label
					class="text-xs font-medium"
					for="pos-{i}-pts"
					title={i18n.t('admin.shifts.position.pointsHint')}
					>{i18n.t('admin.shifts.position.points')}</label
				>
				<input
					id="pos-{i}-pts"
					type="number"
					min="0"
					max="1000"
					placeholder={i18n.t('admin.shifts.position.pointsInherit')}
					class="block h-10 w-full tabular-nums"
					value={position.pointsPerShift ?? ''}
					oninput={(e) => {
						const v = e.currentTarget.value;
						position.pointsPerShift = v === '' ? null : Number(v);
					}}
				/>
			</div>
			<div class="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:justify-end">
				{#if position.booked}<span class="text-xs text-ink-muted"
						>{i18n.t('admin.shifts.position.booked', { count: position.booked })}</span
					>{/if}
				{#if positions.length > 1 && !position.booked}
					<button
						type="button"
						class="h-10 rounded-md px-2 text-sm text-ink-muted hover:bg-ink/6 hover:text-ink"
						aria-label={i18n.t('admin.shifts.position.remove')}
						onclick={() => positions.splice(i, 1)}>✕</button
					>
				{/if}
			</div>
			{#if qualifications.length}
				<div
					class="col-span-full flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-2 text-xs"
				>
					<span class="font-medium">{i18n.t('admin.shifts.position.requirements')}:</span>
					{#each qualifications as q (q.id)}
						<label class="flex items-center gap-1.5">
							<span>{localized(q, 'name', i18n.locale)}</span>
							<select
								class="h-8 py-0 text-xs"
								value={requirementOf(position, q.id)}
								onchange={(e) => setRequirement(position, q.id, e.currentTarget.value)}
							>
								<option value="">{i18n.t('admin.shifts.requirement.none')}</option>
								<option value="required">{i18n.t('admin.shifts.requirement.required')}</option>
								<option value="preferred">{i18n.t('admin.shifts.requirement.preferred')}</option>
							</select>
						</label>
					{/each}
				</div>
			{/if}
		</div>
	{/each}

	{#if error}<p class="text-sm text-red-600 dark:text-red-400">{i18n.t(error as never)}</p>{/if}

	<button
		type="button"
		class="text-sm font-semibold text-brand-text hover:underline"
		onclick={() => positions.push(blank())}
	>
		+ {i18n.t('admin.shifts.position.add')}
	</button>
</fieldset>
