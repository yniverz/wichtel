<script lang="ts">
	import { enhance } from '$app/forms';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import ConfirmForm from '#lib/components/ConfirmForm.svelte';
	import Field from '#lib/components/Field.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Toast from '#lib/components/Toast.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDate, formatPoints, formatTime, localized } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const tz = $derived(data.timezone);
	const pts = (n: number) => formatPoints(n, i18n.t);
	type Result = {
		action?: string;
		success?: string;
		error?: string;
		errors?: Record<string, string>;
		values?: Record<string, string>;
	};
	const result = $derived(form as Result | null);
	const adjustForm = pendingForm();
</script>

<svelte:head><title>{data.person.name} · {i18n.t('admin.desk.title')}</title></svelte:head>

<PageHeader
	title={data.person.name}
	back={{ href: '/admin/desk', label: i18n.t('admin.desk.title') }}
/>

<div class="-mt-4 mb-8 flex flex-wrap items-end gap-x-10 gap-y-3">
	<div>
		<p class="font-display text-7xl text-brand-text tabular-nums">{data.balance}</p>
		<p class="text-sm text-ink-muted">
			{i18n.t('goodies.balanceHint')}{#if data.pending > 0}
				· {i18n.t('goodies.pending', { count: data.pending })}{/if}
		</p>
	</div>
	{#if data.person.phone}<a
			href="tel:{data.person.phone}"
			class="text-ink-muted tabular-nums hover:underline">{data.person.phone}</a
		>{/if}
	{#if !data.person.emailVerified}<Badge tone="warning">{i18n.t('admin.people.unverified')}</Badge
		>{/if}
</div>

<div class="grid gap-12 lg:grid-cols-2">
	<div class="space-y-10">
		{#if data.access.checkIn}
			<section aria-labelledby="today">
				<h2 id="today" class="border-b-2 border-ink pb-1 text-sm font-bold">
					{i18n.t('admin.desk.today')}
				</h2>
				{#if data.today.length === 0}
					<p class="py-3 text-sm text-ink-muted">{i18n.t('admin.desk.todayEmpty')}</p>
				{:else}
					<ul class="divide-y divide-line">
						{#each data.today as s (s.assignmentId)}
							<li class="flex flex-wrap items-center justify-between gap-3 py-3">
								<div>
									<p class="font-bold">{localized(s, 'title', i18n.locale)}</p>
									<p class="text-sm text-ink-muted tabular-nums">
										{formatTime(s.startsAt, i18n.locale, tz)}–{formatTime(
											s.endsAt,
											i18n.locale,
											tz
										)} · {localized(
											{ nameDe: s.positionDe, nameEn: s.positionEn },
											'name',
											i18n.locale
										)}
									</p>
								</div>
								{#if s.attendance === 'attended'}
									<div class="flex items-center gap-3">
										<Badge tone="brand">{i18n.t('admin.desk.checkedIn')}</Badge>
										{#if s.canCheckIn}
											<form method="POST" action="?/checkIn" use:enhance>
												<input type="hidden" name="assignmentId" value={s.assignmentId} />
												<Button
													type="submit"
													name="attendance"
													value="unknown"
													variant="ghost"
													size="sm">{i18n.t('admin.desk.undo')}</Button
												>
											</form>
										{/if}
									</div>
								{:else if s.canCheckIn}
									<form method="POST" action="?/checkIn" use:enhance>
										<input type="hidden" name="assignmentId" value={s.assignmentId} />
										<Button type="submit" name="attendance" value="attended" size="lg"
											>{i18n.t('admin.desk.checkIn')}</Button
										>
									</form>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}

		{#if data.access.issue}
			<section aria-labelledby="pickup">
				<h2 id="pickup" class="border-b-2 border-ink pb-1 text-sm font-bold">
					{i18n.t('admin.desk.pickup')}
				</h2>
				{#if data.claims.length === 0}
					<p class="py-3 text-sm text-ink-muted">{i18n.t('admin.desk.pickupEmpty')}</p>
				{:else}
					<ul class="divide-y divide-line">
						{#each data.claims as c (c.id)}
							<li class="flex flex-wrap items-center justify-between gap-3 py-3">
								<p class="text-lg font-bold">
									{localized(c.goodie, 'name', i18n.locale)}{#if c.variant}<span
											class="font-normal"
										>
											· {c.variant}</span
										>{/if}
									{#if c.status === 'refund_pending'}<span class="ml-1 align-middle"
											><Badge tone="warning">{i18n.t('goodies.claim.refund_pending')}</Badge></span
										>{/if}
								</p>
								{#if c.details.length}
									<p class="w-full text-sm text-ink-muted">
										{c.details
											.map(
												(d) =>
													`${localized({ labelDe: d.labelDe, labelEn: d.labelEn }, 'label', i18n.locale)}: ${d.value}`
											)
											.join(' · ')}
									</p>
								{/if}
								<div class="flex gap-2">
									{#if c.status === 'selected'}
										<ConfirmForm
											action="?/cancel"
											hidden={{ claimId: c.id }}
											variant="ghost"
											message={i18n.t('goodies.claim.cancelConfirm')}
											confirmLabel={i18n.t('goodies.claim.cancel')}
										>
											{i18n.t('goodies.claim.cancel')}
										</ConfirmForm>
										<form method="POST" action="?/issue" use:enhance>
											<input type="hidden" name="claimId" value={c.id} />
											<Button type="submit" size="lg">{i18n.t('admin.desk.issue')}</Button>
										</form>
									{:else}
										<form method="POST" action="?/refunded" use:enhance>
											<input type="hidden" name="claimId" value={c.id} />
											<Button type="submit" variant="secondary"
												>{i18n.t('admin.desk.markRefunded')}</Button
											>
										</form>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}
	</div>

	<div class="space-y-10">
		{#if data.access.issue && data.handOut.length}
			<section aria-labelledby="handout">
				<h2 id="handout" class="border-b-2 border-ink pb-1 text-sm font-bold">
					{i18n.t('admin.desk.handOut')}
				</h2>
				<ul class="divide-y divide-line">
					{#each data.handOut as g (g.id)}
						<li>
							<form
								method="POST"
								action="?/handOut"
								use:enhance
								class="flex flex-wrap items-center justify-between gap-3 py-3"
							>
								<input type="hidden" name="goodieId" value={g.id} />
								<span>
									<span class="font-semibold">{localized(g, 'name', i18n.locale)}</span>
									<span class="text-sm text-ink-muted">
										· {g.price === 0 ? i18n.t('goodies.free') : pts(g.price)}</span
									>
								</span>
								<span class="flex gap-2">
									{#if g.variants.length}
										<select
											name="variant"
											required
											class="h-9 py-0 text-sm"
											aria-label={i18n.t('goodies.variant')}
										>
											<option value="" disabled selected>{i18n.t('goodies.variant')}</option>
											{#each g.variants as v (v)}<option value={v}>{v}</option>{/each}
										</select>
									{/if}
									<Button type="submit" size="sm" variant="secondary" disabled={!g.affordable}
										>{i18n.t('admin.desk.issue')}</Button
									>
								</span>
							</form>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if data.access.adjust}
			<section aria-labelledby="adjust">
				<h2 id="adjust" class="border-b-2 border-ink pb-1 text-sm font-bold">
					{i18n.t('admin.desk.adjust')}
				</h2>
				<form
					method="POST"
					action="?/adjust"
					use:enhance={adjustForm.submit}
					class="mt-3 grid gap-3 sm:grid-cols-[7rem_1fr_auto] sm:items-end"
				>
					<Field
						label={i18n.t('admin.desk.amount')}
						name="amount"
						type="number"
						step="1"
						value={result?.action === 'adjust' ? (result.values?.amount ?? '') : ''}
						error={result?.action === 'adjust' ? result.errors?.amount : undefined}
					/>
					<Field
						label={i18n.t('admin.desk.reason')}
						name="reason"
						value={result?.action === 'adjust' ? (result.values?.reason ?? '') : ''}
						error={result?.action === 'adjust' ? result.errors?.reason : undefined}
					/>
					<Button type="submit" variant="secondary" loading={adjustForm.pending}
						>{i18n.t('admin.desk.adjustSubmit')}</Button
					>
				</form>
			</section>
		{/if}

		<section aria-labelledby="history">
			<h2 id="history" class="border-b-2 border-ink pb-1 text-sm font-bold">
				{i18n.t('goodies.history')}
			</h2>
			{#if data.history.length === 0}
				<p class="py-3 text-sm text-ink-muted">{i18n.t('goodies.history.empty')}</p>
			{:else}
				<ul class="divide-y divide-line">
					{#each data.history as h (h.id)}
						<li class="flex items-baseline justify-between gap-4 py-2 text-sm">
							<span class="min-w-0 truncate">
								{#if h.kind === 'shift'}{h.shiftTitleDe
										? localized(
												{ titleDe: h.shiftTitleDe, titleEn: h.shiftTitleEn },
												'title',
												i18n.locale
											)
										: i18n.t('nav.shifts')}
								{:else if h.kind === 'goodie'}{h.goodieNameDe
										? localized(
												{ nameDe: h.goodieNameDe, nameEn: h.goodieNameEn },
												'name',
												i18n.locale
											)
										: i18n.t('nav.goodies')}
								{:else}{i18n.t('goodies.history.adjustment')}{#if h.reason}: {h.reason}{/if}{/if}
								<span class="text-xs text-ink-muted">
									· {formatDate(new Date(h.createdAt), i18n.locale)}</span
								>
							</span>
							<span class="font-bold tabular-nums">{h.amount > 0 ? '+' : ''}{h.amount}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>

<Toast
	message={result?.error ?? result?.success}
	tone={result?.error ? 'error' : 'success'}
	token={form}
/>
