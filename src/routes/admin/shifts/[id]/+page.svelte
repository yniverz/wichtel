<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import ConfirmForm from '#lib/components/ConfirmForm.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SpotMeter from '#lib/components/SpotMeter.svelte';
	import Toast from '#lib/components/Toast.svelte';
	import PersonPicker from '#lib/components/admin/PersonPicker.svelte';
	import ShiftForm from '#lib/components/admin/ShiftForm.svelte';
	import type { EditablePosition } from '#lib/components/admin/PositionsEditor.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import {
		formatDateTime,
		formatDayLong,
		formatTime,
		localized,
		type MessageKey
	} from '#lib/i18n/index.ts';
	import Field from '#lib/components/Field.svelte';
	import { utcToZoned } from '#lib/domain/time.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const tz = $derived(data.timezone);
	type Result = {
		action?: string;
		error?: string;
		success?: string;
		errors?: Record<string, string>;
		values?: Record<string, string>;
		positions?: string;
		issues?: string[];
		pending?: { positionId: string; userId: string };
		count?: number;
	};
	const result = $derived(form as Result | null);
	const title = $derived(localized(data.shift, 'title', i18n.locale));
	const day = $derived(utcToZoned(new Date(data.shift.startsAt), tz).date);

	const editValues = $derived(
		data.form
			? { ...data.form.values, ...(result?.action === 'update' ? (result.values ?? {}) : {}) }
			: null
	);
	const editPositions = $derived.by((): EditablePosition[] => {
		if (result?.action === 'update' && result.positions) {
			try {
				return JSON.parse(result.positions);
			} catch {
				/* fall through */
			}
		}
		return data.form?.positions ?? [];
	});

	let addTo = $state<string | null>(null);
	let urgentFor = $state<string | null>(null);
	const attendanceOptions = [
		{ value: 'unknown', label: 'admin.shifts.unknown' },
		{ value: 'attended', label: 'admin.shifts.attended' },
		{ value: 'no_show', label: 'admin.shifts.noShow' }
	] as const satisfies readonly { value: string; label: MessageKey }[];
</script>

<svelte:head><title>{title} · {page.data.settings.festivalName}</title></svelte:head>

<PageHeader {title} back={{ href: '/admin/shifts', label: i18n.t('admin.shifts.title') }}>
	{#snippet actions()}
		{#if data.can.edit}<Button
				href="/admin/shifts/new?from={data.shift.id}"
				variant="secondary"
				size="sm">{i18n.t('admin.shifts.duplicate')}</Button
			>{/if}
		{#if data.can.mail}<Button
				href="/admin/mail?shift={data.shift.id}"
				variant="secondary"
				size="sm">{i18n.t('admin.mail.toShift')}</Button
			>{/if}
	{/snippet}
</PageHeader>

<p class="-mt-4 mb-8 text-ink-muted tabular-nums">
	{formatDayLong(day, i18n.locale)} · {formatTime(
		data.shift.startsAt,
		i18n.locale,
		tz
	)}–{formatTime(data.shift.endsAt, i18n.locale, tz)}
	· {data.shift.areaPath.map((a) => localized(a, 'name', i18n.locale)).join(' › ')}
	{#if data.shift.location}· {data.shift.location}{/if}
</p>

<section aria-labelledby="roster" class="mb-12">
	<h2 id="roster" class="mb-4 text-lg font-bold">{i18n.t('admin.shifts.roster')}</h2>
	<div class="space-y-8">
		{#each data.shift.positions as position (position.id)}
			<div>
				<div class="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink pb-1">
					<h3 class="font-bold">
						{localized(position, 'name', i18n.locale)}
						{#if position.mode === 'request'}<span class="text-sm font-normal text-ink-muted"
								>· {i18n.t('admin.shifts.mode.request')}</span
							>{/if}
					</h3>
					<span class="flex items-center gap-2 text-sm tabular-nums">
						{#if position.urgentAt && position.booked < position.capacity}
							<Badge tone="urgent"
								>{i18n.t('admin.urgent.active', {
									time: formatTime(position.urgentAt, i18n.locale, tz)
								})}{position.urgentBonus > 0 ? ` · +${position.urgentBonus}` : ''}</Badge
							>
						{/if}
						<SpotMeter capacity={position.capacity} taken={position.booked} />
						{position.booked}/{position.capacity}</span
					>
				</div>

				{#if position.people.length === 0}
					<p class="py-3 text-sm text-ink-muted">{i18n.t('admin.shifts.rosterEmpty')}</p>
				{:else}
					<ul class="divide-y divide-line">
						{#each position.people as person (person.id)}
							<li class="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
								<div class="min-w-40 flex-1">
									<a href="/admin/people/{person.userId}" class="font-semibold hover:underline"
										>{person.name}</a
									>
									{#if person.phone}<a
											href="tel:{person.phone}"
											class="block text-sm text-ink-muted tabular-nums hover:underline"
											>{person.phone}</a
										>{/if}
									{#if person.notes.length}
										<span class="block text-sm text-ink-muted">
											{person.notes
												.map(
													(n) =>
														`${localized({ labelDe: n.labelDe, labelEn: n.labelEn }, 'label', i18n.locale)}: ${n.value}`
												)
												.join(' · ')}
										</span>
									{/if}
								</div>

								{#if person.status === 'requested'}
									<Badge tone="warning">{i18n.t('admin.shifts.requested')}</Badge>
									{#if data.can.manage}
										<form method="POST" action="?/decide" use:enhance class="flex gap-2">
											<input type="hidden" name="id" value={person.id} />
											<Button type="submit" name="approve" value="on" size="sm"
												>{i18n.t('admin.shifts.approve')}</Button
											>
											<Button type="submit" name="approve" value="" size="sm" variant="secondary"
												>{i18n.t('admin.shifts.reject')}</Button
											>
										</form>
									{/if}
								{:else if person.status === 'waitlisted'}
									<Badge>{i18n.t('admin.shifts.waitlisted')}</Badge>
								{:else if person.status === 'held'}
									<Badge tone="warning"
										>{person.holdUntil
											? i18n.t('admin.shifts.heldUntil', {
													date: formatDateTime(new Date(person.holdUntil), i18n.locale, tz)
												})
											: i18n.t('admin.shifts.held')}</Badge
									>
								{:else if data.can.attendance}
									<form
										method="POST"
										action="?/attendance"
										use:enhance
										class="inline-flex rounded-md border border-ink/25 p-0.5"
										aria-label={i18n.t('admin.shifts.attendance')}
									>
										<input type="hidden" name="id" value={person.id} />
										{#each attendanceOptions as opt (opt.value)}
											<button
												name="attendance"
												value={opt.value}
												disabled={!data.can.checkInOpen}
												aria-pressed={person.attendance === opt.value}
												class="rounded px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40 {person.attendance ===
												opt.value
													? opt.value === 'attended'
														? 'bg-brand text-brand-fg'
														: opt.value === 'no_show'
															? 'bg-ink text-surface'
															: 'bg-ink/10'
													: 'text-ink-muted hover:text-ink'}">{i18n.t(opt.label)}</button
											>
										{/each}
									</form>
								{/if}

								{#if data.can.manage}
									<ConfirmForm
										action="?/remove"
										hidden={{ id: person.id }}
										variant="ghost"
										message={i18n.t('admin.shifts.removeConfirm', { name: person.name })}
										confirmLabel={i18n.t('admin.shifts.remove')}
									>
										{i18n.t('admin.shifts.remove')}
									</ConfirmForm>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}

				{#if data.can.manage}
					{#if addTo === position.id}
						<form
							method="POST"
							action="?/add"
							use:enhance={() =>
								async ({ update, result: r }) => {
									await update({ reset: false });
									if (r.type === 'success') addTo = null;
								}}
							class="mt-3 grid gap-3 rounded-md border border-line bg-surface-raised p-3 sm:grid-cols-[1fr_auto] sm:items-end"
						>
							<input type="hidden" name="positionId" value={position.id} />
							<PersonPicker label={i18n.t('admin.shifts.addPerson')} />
							<div class="flex gap-2">
								<Button type="submit" size="sm">{i18n.t('admin.shifts.add')}</Button>
								<Button type="button" size="sm" variant="ghost" onclick={() => (addTo = null)}
									>{i18n.t('common.cancel')}</Button
								>
							</div>
						</form>
						{#if result?.action === 'add' && result.issues && result.pending?.positionId === position.id}
							<div class="mt-3 rounded-md border border-accent bg-accent/20 p-3 text-sm">
								<p class="font-semibold">
									{i18n.t('admin.shifts.issues')}
									{result.issues
										.map((x) => i18n.t(`admin.shifts.issue.${x}` as MessageKey))
										.join(', ')}.
								</p>
								{#if data.can.override}
									<form method="POST" action="?/add" use:enhance class="mt-2">
										<input type="hidden" name="positionId" value={result.pending.positionId} />
										<input type="hidden" name="userId" value={result.pending.userId} />
										<input type="hidden" name="override" value="on" />
										<Button type="submit" size="sm" variant="secondary"
											>{i18n.t('admin.shifts.addAnyway')}</Button
										>
									</form>
								{:else}
									<p class="mt-1">{i18n.t('admin.shifts.noOverride')}</p>
								{/if}
							</div>
						{/if}
					{:else}
						<div class="mt-2 flex flex-wrap gap-x-6 gap-y-2">
							<button
								type="button"
								class="text-sm font-semibold text-brand-text hover:underline"
								onclick={() => (addTo = position.id)}>+ {i18n.t('admin.shifts.addPerson')}</button
							>
							{#if !data.can.started && position.booked < position.capacity}
								<button
									type="button"
									class="text-sm font-semibold text-brand-text hover:underline"
									aria-expanded={urgentFor === position.id}
									onclick={() => (urgentFor = urgentFor === position.id ? null : position.id)}
									>{i18n.t('admin.urgent.title')} …</button
								>
							{/if}
							{#if position.urgentAt}
								<form method="POST" action="?/endUrgent" use:enhance>
									<input type="hidden" name="positionId" value={position.id} />
									<button type="submit" class="text-sm font-semibold text-ink-muted hover:underline"
										>{i18n.t('admin.urgent.end')}</button
									>
								</form>
							{/if}
						</div>
					{/if}
					{#if urgentFor === position.id}
						<form
							method="POST"
							action="?/urgent"
							use:enhance={() =>
								async ({ update, result: r }) => {
									await update({ reset: false });
									if (r.type === 'success') urgentFor = null;
								}}
							class="mt-3 space-y-3 rounded-md border border-brand/50 bg-surface-raised p-3"
						>
							<input type="hidden" name="positionId" value={position.id} />
							<p class="text-sm text-ink-muted">{i18n.t('admin.urgent.lead')}</p>
							<div class="grid gap-3 sm:grid-cols-[10rem_1fr]">
								<Field
									label={i18n.t('admin.urgent.bonus')}
									name="bonus"
									type="number"
									min="0"
									max="100"
									value={String(position.urgentBonus || 0)}
									hint={i18n.t('admin.urgent.bonusHint')}
									error={result?.action === 'urgent' ? result.errors?.bonus : undefined}
								/>
								<Field
									label={i18n.t('admin.urgent.note')}
									name="note"
									optional
									maxlength={300}
									error={result?.action === 'urgent' ? result.errors?.note : undefined}
								/>
							</div>
							<Button type="submit" size="sm">{i18n.t('admin.urgent.submit')}</Button>
						</form>
					{/if}
				{/if}
			</div>
		{/each}
	</div>
	{#if data.can.attendance && !data.can.checkInOpen}
		<p class="mt-4 text-sm text-ink-muted">{i18n.t('error.checkInTooEarly')}</p>
	{/if}
</section>

{#if data.can.edit && editValues}
	<section aria-labelledby="edit" class="border-t-2 border-ink pt-6">
		<h2 id="edit" class="mb-6 text-lg font-bold">{i18n.t('admin.shifts.edit')}</h2>
		<ShiftForm
			action="?/update"
			values={editValues}
			positions={editPositions}
			areas={data.areas}
			qualifications={data.qualifications}
			places={data.places}
			result={result?.action === 'update' ? result : null}
			submitLabel={i18n.t('common.save')}
		/>

		<div class="mt-10 border-t border-line pt-6">
			<ConfirmForm
				action="?/delete"
				message={i18n.t('admin.shifts.deleteConfirm', { name: title })}
				confirmLabel={i18n.t('admin.shifts.delete')}
			>
				{i18n.t('admin.shifts.delete')}
			</ConfirmForm>
		</div>
	</section>
{/if}

<Toast
	message={result && result.action !== 'update' && !result.issues
		? (result.error ??
			(result.success === 'admin.urgent.sent'
				? i18n.t('admin.urgent.sent', { count: result.count ?? 0 })
				: result.success))
		: null}
	tone={result?.error ? 'error' : 'success'}
	token={form}
/>
