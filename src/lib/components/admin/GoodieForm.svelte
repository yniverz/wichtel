<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '#lib/components/Button.svelte';
	import Field from '#lib/components/Field.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { isMessageKey, localized } from '#lib/i18n/index.ts';

	type Values = {
		nameDe: string;
		nameEn: string;
		descriptionDe: string;
		descriptionEn: string;
		price: number;
		maxPerPerson: number;
		selfServiceLimit: number | null;
		stock: number | null;
		variants: string[];
		requiredAreaIds: string[];
		mandatory: boolean;
		mandatoryPriority: number;
		refundable: boolean;
		advance: boolean;
		active: boolean;
		sortOrder: number;
		pickupPlaceId: string | null;
		pickupInfo: string;
	};

	let {
		action,
		values,
		areas,
		places,
		result,
		submitLabel
	}: {
		action: string;
		values: Values;
		areas: { id: string; nameDe: string; nameEn: string; depth: number }[];
		places: { id: string; nameDe: string; nameEn: string }[];
		result?: { error?: string; success?: string; errors?: Record<string, string> } | null;
		submitLabel: string;
	} = $props();

	const i18n = getI18n();
	const submitter = pendingForm({ reset: false });
	const e = $derived(result?.errors ?? {});
	const num = (v: number | null) => (v === null ? '' : String(v));
	// svelte-ignore state_referenced_locally
	let mandatory = $state(values.mandatory);
</script>

<form method="POST" {action} class="space-y-8" use:enhance={submitter.submit}>
	<FormMessage error={result?.error} success={result?.success} />

	<fieldset class="space-y-4">
		<div class="grid gap-4 sm:grid-cols-2">
			<Field
				label={i18n.t('admin.goodies.nameDe')}
				name="nameDe"
				value={values.nameDe}
				error={e.nameDe}
			/>
			<Field
				label={i18n.t('admin.goodies.nameEn')}
				name="nameEn"
				optional
				value={values.nameEn}
				error={e.nameEn}
			/>
			<Field
				label={i18n.t('admin.goodies.descriptionDe')}
				name="descriptionDe"
				optional
				value={values.descriptionDe}
			/>
			<Field
				label={i18n.t('admin.goodies.descriptionEn')}
				name="descriptionEn"
				optional
				value={values.descriptionEn}
			/>
		</div>
		<div class="grid gap-4 sm:grid-cols-3">
			<Field
				label={i18n.t('admin.goodies.price')}
				name="price"
				type="number"
				min="0"
				value={String(values.price)}
				error={e.price}
			/>
			<Field
				label={i18n.t('admin.goodies.maxPerPerson')}
				name="maxPerPerson"
				type="number"
				min="1"
				value={String(values.maxPerPerson)}
				error={e.maxPerPerson}
			/>
			<Field
				label={i18n.t('admin.goodies.sortOrder')}
				name="sortOrder"
				type="number"
				value={String(values.sortOrder)}
			/>
		</div>
		<Field
			label={i18n.t('admin.goodies.variants')}
			name="variants"
			optional
			placeholder="S, M, L, XL"
			hint={i18n.t('admin.goodies.variantsHint')}
			value={values.variants.join(', ')}
			error={e.variants}
		/>
	</fieldset>

	<fieldset class="space-y-4">
		<legend class="mb-1 w-full border-b border-ink pb-1 text-sm font-bold"
			>{i18n.t('goodies.pickup')}</legend
		>
		<div class="grid gap-4 sm:grid-cols-2">
			{#if places.length}
				<div class="space-y-1.5">
					<label for="pickupPlaceId" class="text-sm font-medium"
						>{i18n.t('admin.goodies.pickupPlace')}</label
					>
					<select
						id="pickupPlaceId"
						name="pickupPlaceId"
						class="block h-11 w-full"
						value={values.pickupPlaceId ?? ''}
						aria-invalid={e.pickupPlaceId ? 'true' : undefined}
					>
						<option value="">{i18n.t('admin.goodies.pickupDesk')}</option>
						{#each places as pl (pl.id)}<option value={pl.id}
								>{localized(pl, 'name', i18n.locale)}</option
							>{/each}
					</select>
					{#if e.pickupPlaceId}<p class="text-sm text-red-600 dark:text-red-400">
							{isMessageKey(e.pickupPlaceId) ? i18n.t(e.pickupPlaceId) : e.pickupPlaceId}
						</p>{/if}
				</div>
			{/if}
			<Field
				label={i18n.t('admin.goodies.pickupInfo')}
				name="pickupInfo"
				optional
				placeholder={i18n.t('admin.goodies.pickupInfoPlaceholder')}
				value={values.pickupInfo}
				error={e.pickupInfo}
			/>
		</div>
		<p class="-mt-2 text-sm text-ink-muted">{i18n.t('admin.goodies.pickupHint')}</p>
	</fieldset>

	<fieldset class="space-y-4">
		<legend class="mb-1 w-full border-b border-ink pb-1 text-sm font-bold"
			>{i18n.t('admin.goodies.rules')}</legend
		>
		<div class="grid gap-4 sm:grid-cols-2">
			<Field
				label={i18n.t('admin.goodies.selfServiceLimit')}
				name="selfServiceLimit"
				type="number"
				min="0"
				optional
				hint={i18n.t('admin.goodies.selfServiceLimitHint')}
				value={num(values.selfServiceLimit)}
				error={e.selfServiceLimit}
			/>
			<Field
				label={i18n.t('admin.goodies.stock')}
				name="stock"
				type="number"
				min="0"
				optional
				value={num(values.stock)}
				error={e.stock}
			/>
		</div>

		<div class="space-y-2">
			<label class="flex items-start gap-3 text-sm"
				><input
					type="checkbox"
					name="active"
					checked={values.active}
					class="mt-0.5 size-4"
				/>{i18n.t('admin.goodies.active')}</label
			>
			<label class="flex items-start gap-3 text-sm"
				><input
					type="checkbox"
					name="advance"
					checked={values.advance}
					class="mt-0.5 size-4"
				/>{i18n.t('admin.goodies.advance')}</label
			>
			<label class="flex items-start gap-3 text-sm"
				><input
					type="checkbox"
					name="refundable"
					checked={values.refundable}
					class="mt-0.5 size-4"
				/>{i18n.t('admin.goodies.refundable')}</label
			>
			<label class="flex items-start gap-3 text-sm"
				><input
					type="checkbox"
					name="mandatory"
					bind:checked={mandatory}
					class="mt-0.5 size-4"
				/>{i18n.t('admin.goodies.mandatory')}</label
			>
			{#if mandatory}
				<div class="ml-7 max-w-56">
					<Field
						label={i18n.t('admin.goodies.mandatoryPriority')}
						name="mandatoryPriority"
						type="number"
						min="0"
						value={String(values.mandatoryPriority)}
					/>
				</div>
			{/if}
		</div>

		{#if areas.length}
			<div>
				<p class="text-sm font-medium">{i18n.t('admin.goodies.requiredAreas')}</p>
				<p class="mb-2 text-sm text-ink-muted">{i18n.t('admin.goodies.requiredAreasHint')}</p>
				<div class="grid gap-1 sm:grid-cols-2">
					{#each areas as a (a.id)}
						<label
							class="flex items-center gap-3 text-sm"
							style="padding-left: {a.depth * 1.25}rem"
						>
							<input
								type="checkbox"
								name="requiredAreaIds[]"
								value={a.id}
								checked={values.requiredAreaIds.includes(a.id)}
								class="size-4"
							/>
							{localized(a, 'name', i18n.locale)}
						</label>
					{/each}
				</div>
			</div>
		{/if}
	</fieldset>

	<Button type="submit" size="lg" loading={submitter.pending}>{submitLabel}</Button>
</form>
