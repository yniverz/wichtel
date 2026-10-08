<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import ConfirmForm from '#lib/components/ConfirmForm.svelte';
	import FieldInputs from '#lib/components/FieldInputs.svelte';
	import PlaceLink from '#lib/components/places/PlaceLink.svelte';
	import Toast from '#lib/components/Toast.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDate, formatPoints, localized, type MessageKey } from '#lib/i18n/index.ts';
	import type { PlaceInfo } from '#lib/components/places/PlaceDetails.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const pts = (n: number) => formatPoints(n, i18n.t);
	type Result = {
		success?: string;
		error?: string;
		goodieId?: string;
		errors?: Record<string, string>;
	};
	const result = $derived(form as Result | null);
	const fieldErrors = $derived(result?.errors ? result : null);
	let pending = $state<string | null>(null);
	let qrDialog: HTMLDialogElement | undefined = $state();

	const statusTone = {
		selected: 'bg-brand text-brand-fg',
		issued: 'border border-line text-ink-muted',
		refund_pending: 'bg-accent text-accent-fg',
		refunded: 'border border-line text-ink-muted'
	} as Record<string, string>;

	const areaNames = $derived(data.areaNames as Record<string, { nameDe: string; nameEn: string }>);

	function reason(g: NonNullable<typeof data.overview>['goodies'][number]): string {
		const o = data.overview!;
		switch (g.availability) {
			case 'notEnoughPoints':
				return i18n.t('goodies.reason.notEnoughPoints', {
					count: pts(
						g.price - (o.balance - (g.mandatory ? 0 : o.reserved) + (g.advance ? o.pending : 0))
					)
				});
			case 'notEligible':
				return i18n.t('goodies.reason.notEligible', {
					areas: g.requiredAreaIds
						.map((id) => (areaNames[id] ? localized(areaNames[id], 'name', i18n.locale) : ''))
						.filter(Boolean)
						.join(', ')
				});
			case 'available':
				return '';
			default:
				return i18n.t(`goodies.reason.${g.availability}` as MessageKey);
		}
	}
</script>

{#snippet pickupLine(pickup: { place: PlaceInfo | null; info: string })}
	{#if pickup.place || pickup.info}
		<p class="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm">
			<span class="text-ink-muted">{i18n.t('goodies.pickup')}:</span>
			{#if pickup.place}<PlaceLink
					place={pickup.place}
					sitePlanAssetId={data.sitePlanAssetId}
				/>{/if}
			{#if pickup.info}<span class={pickup.place ? 'text-ink-muted' : ''}>{pickup.info}</span>{/if}
		</p>
	{/if}
{/snippet}

<svelte:head
	><title>{i18n.t('goodies.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<header class="border-b border-ink pb-4">
	<h1 class="font-display text-5xl uppercase sm:text-6xl">{i18n.t('goodies.title')}</h1>
</header>

<div class="mt-8 grid gap-10 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
	<div class="space-y-10">
		{#if data.overview}
			<!-- Balance -->
			<section>
				<p class="font-display text-8xl text-brand-text tabular-nums">{data.overview.balance}</p>
				<p class="mt-1 font-semibold">{i18n.t('goodies.balanceHint')}</p>
				{#if data.overview.pending > 0}
					<p class="text-sm text-ink-muted">
						{i18n.t('goodies.pending', { count: data.overview.pending })}
					</p>
				{/if}
				<div class="mt-4 md:hidden">
					<Button variant="secondary" onclick={() => qrDialog?.showModal()}
						>{i18n.t('goodies.code.show')}</Button
					>
				</div>
			</section>

			<!-- Own claims -->
			<section aria-labelledby="claims">
				<h2 id="claims" class="border-b-2 border-ink pb-1 text-sm font-bold">
					{i18n.t('goodies.claims.title')}
				</h2>
				{#if data.overview.claims.length === 0}
					<p class="py-3 text-sm text-ink-muted">{i18n.t('goodies.claims.empty')}</p>
				{:else}
					<ul class="divide-y divide-line">
						{#each data.overview.claims as claim (claim.id)}
							<li class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
								<div>
									<p class="font-bold">
										{localized(claim.goodie, 'name', i18n.locale)}{#if claim.variant}<span
												class="font-normal text-ink-muted"
											>
												· {claim.variant}</span
											>{/if}
									</p>
									{#if claim.status === 'selected'}{@render pickupLine(claim.goodie.pickup)}{/if}
									<span
										class="mt-1 inline-block rounded-sm px-1.5 py-px text-xs font-semibold {statusTone[
											claim.status
										]}"
									>
										{i18n.t(
											`goodies.claim.${claim.status}` as MessageKey
										)}{#if claim.issuedAt && claim.status === 'issued'}
											· {formatDate(new Date(claim.issuedAt), i18n.locale)}{/if}
									</span>
								</div>
								{#if claim.status === 'selected'}
									<div class="flex flex-wrap gap-2">
										{#if claim.goodie.refundable}
											<ConfirmForm
												action="?/refund"
												hidden={{ claimId: claim.id }}
												variant="secondary"
												message={i18n.t('goodies.claim.refundConfirm')}
												confirmLabel={i18n.t('goodies.claim.refund')}
											>
												{i18n.t('goodies.claim.refund')}
											</ConfirmForm>
										{/if}
										{#if !claim.goodie.mandatory}
											<ConfirmForm
												action="?/cancel"
												hidden={{ claimId: claim.id }}
												variant="ghost"
												message={i18n.t('goodies.claim.cancelConfirm')}
												confirmLabel={i18n.t('goodies.claim.cancel')}
											>
												{i18n.t('goodies.claim.cancel')}
											</ConfirmForm>
										{/if}
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<!-- Catalogue -->
			<section aria-labelledby="catalogue">
				<h2 id="catalogue" class="border-b-2 border-ink pb-1 text-sm font-bold">
					{i18n.t('goodies.list.title')}
				</h2>
				{#if data.overview.goodies.length === 0}
					<p class="py-3 text-sm text-ink-muted">{i18n.t('goodies.empty')}</p>
				{:else}
					<ul class="divide-y divide-line">
						{#each data.overview.goodies as g (g.id)}
							<li class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 py-4">
								<div class="min-w-0">
									<p class="font-bold">{localized(g, 'name', i18n.locale)}</p>
									{#if localized(g, 'description', i18n.locale)}
										<p class="text-sm text-ink-muted">{localized(g, 'description', i18n.locale)}</p>
									{/if}
									{@render pickupLine(g.pickup)}
									<p class="mt-1 text-sm">
										{#if g.mandatory}{i18n.t('goodies.mandatory')}
										{:else if g.availability !== 'available'}<span class="text-ink-muted"
												>{reason(g)}</span
											>
										{:else if g.remaining !== null}<span class="text-ink-muted"
												>{i18n.t('goodies.remaining', { count: g.remaining })}</span
											>{/if}
										{#if g.advance && !g.mandatory}<span class="text-ink-muted">
												· {i18n.t('goodies.advance')}</span
											>{/if}
									</p>
								</div>
								<p class="font-display text-right text-2xl tabular-nums">
									{g.price === 0 ? i18n.t('goodies.free') : pts(g.price)}
								</p>
								{#if g.availability === 'available' && !g.mandatory}
									<form
										method="POST"
										action="?/claim"
										class="col-span-2 flex flex-wrap items-end gap-2"
										use:enhance={() => {
											pending = g.id;
											return async ({ update }) => {
												await update();
												pending = null;
											};
										}}
									>
										<input type="hidden" name="goodieId" value={g.id} />
										{#if g.fields.length}
											<div class="w-full space-y-3">
												<p class="text-sm font-semibold">{i18n.t('goodies.fieldsNeeded')}</p>
												<FieldInputs
													fields={g.fields}
													values={data.fieldValues}
													errors={fieldErrors?.goodieId === g.id ? (fieldErrors.errors ?? {}) : {}}
												/>
											</div>
										{/if}
										{#if g.variants.length}
											<label class="sr-only" for="variant-{g.id}">{i18n.t('goodies.variant')}</label
											>
											<select id="variant-{g.id}" name="variant" required class="h-11 min-w-28">
												<option value="" disabled selected>{i18n.t('goodies.variant')}</option>
												{#each g.variants as v (v)}<option value={v}>{v}</option>{/each}
											</select>
										{/if}
										<Button type="submit" loading={pending === g.id}
											>{i18n.t('goodies.pick')}</Button
										>
									</form>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<!-- History -->
			<details class="group">
				<summary class="cursor-pointer border-b-2 border-ink pb-1 text-sm font-bold"
					>{i18n.t('goodies.history')}</summary
				>
				{#if data.history.length === 0}
					<p class="py-3 text-sm text-ink-muted">{i18n.t('goodies.history.empty')}</p>
				{:else}
					<ul class="divide-y divide-line">
						{#each data.history as h (h.id)}
							<li class="flex items-baseline justify-between gap-4 py-2 text-sm">
								<span class="min-w-0">
									<span class="block truncate">
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
									</span>
									<span class="text-xs text-ink-muted"
										>{formatDate(new Date(h.createdAt), i18n.locale)}</span
									>
								</span>
								<span class="font-bold tabular-nums {h.amount > 0 ? 'text-brand-text' : ''}"
									>{h.amount > 0 ? '+' : ''}{h.amount}</span
								>
							</li>
						{/each}
					</ul>
				{/if}
			</details>
		{/if}
	</div>

	<!-- Personal code -->
	<aside aria-labelledby="code" class="md:sticky md:top-20 md:self-start">
		<h2 id="code" class="border-b-2 border-ink pb-1 text-sm font-bold">
			{i18n.t('goodies.code.title')}
		</h2>
		<button
			type="button"
			class="mt-4 block w-full max-w-64 rounded-md border border-line bg-white p-3"
			onclick={() => qrDialog?.showModal()}
			aria-label={i18n.t('goodies.code.enlarge')}
		>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html data.qr}
		</button>
		<p class="mt-3 max-w-64 text-sm text-ink-muted">{i18n.t('goodies.code.hint')}</p>
		<p class="mt-1 text-sm font-semibold">{page.data.user?.firstName} {page.data.user?.lastName}</p>
	</aside>
</div>

<dialog
	bind:this={qrDialog}
	class="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-lg bg-white p-6 backdrop:bg-ink/70"
	onclick={() => qrDialog?.close()}
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html data.qr}
	<p class="mt-3 text-center text-lg font-bold text-black">
		{page.data.user?.firstName}
		{page.data.user?.lastName}
	</p>
</dialog>

<Toast
	message={result?.error ?? result?.success}
	tone={result?.error ? 'error' : 'success'}
	token={form}
/>
