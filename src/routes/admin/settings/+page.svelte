<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import Field from '#lib/components/Field.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { assetUrl } from '#lib/assets.ts';
	import { contrastRatio, isHexColor, MIN_CONTRAST, readableTextColor } from '#lib/domain/color.ts';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { LOCALES } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const submitter = pendingForm({ reset: false });
	type Result = {
		error?: string;
		success?: string;
		errors?: Record<string, string>;
		values?: Record<string, string>;
	};
	const result = $derived(form as Result | null);
	const v = $derived({ ...data.current, ...(result?.values ?? {}) } as typeof data.current &
		Record<string, string>);

	// Live preview state: follows the saved values, but can be edited locally (writable derived).
	let festivalName = $derived(v.festivalName);
	let primary = $derived(v.primaryColor);
	let accent = $derived(v.accentColor);

	const previews: Record<string, string | null> = $state({
		logo: null,
		background: null,
		favicon: null
	});
	const removed: Record<string, boolean> = $state({
		logo: false,
		background: false,
		favicon: false
	});
	function pick(field: string, event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (previews[field]) URL.revokeObjectURL(previews[field]!);
		previews[field] = file ? URL.createObjectURL(file) : null;
		removed[field] = false;
	}
	const imageSrc = (field: 'logo' | 'background' | 'favicon', id: string | null) =>
		removed[field] ? null : (previews[field] ?? (id ? assetUrl(id) : null));

	const safePrimary = $derived(isHexColor(primary) ? primary : '#c03a1c');
	const safeAccent = $derived(isHexColor(accent) ? accent : '#f4c430');
	const primaryContrast = $derived(contrastRatio(safePrimary, readableTextColor(safePrimary)));
	const accentContrast = $derived(contrastRatio(safeAccent, readableTextColor(safeAccent)));
	const fmt = (n: number) => n.toLocaleString(i18n.locale, { maximumFractionDigits: 1 });

	const images = [
		{ field: 'logo', label: 'admin.settings.logo', column: 'logoAssetId' },
		{ field: 'background', label: 'admin.settings.background', column: 'backgroundAssetId' },
		{ field: 'favicon', label: 'admin.settings.favicon', column: 'faviconAssetId' }
	] as const;
</script>

<svelte:head
	><title>{i18n.t('admin.settings.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader title={i18n.t('admin.settings.title')} />

<form method="POST" enctype="multipart/form-data" class="space-y-6" use:enhance={submitter.submit}>
	<FormMessage error={result?.error} success={result?.success} />

	<Card title={i18n.t('admin.settings.branding')}>
		<div class="grid gap-8 lg:grid-cols-[1fr_20rem]">
			<div class="space-y-5">
				<Field
					label={i18n.t('admin.settings.festivalName')}
					name="festivalName"
					bind:value={festivalName}
					error={result?.errors?.festivalName}
				/>
				<div class="grid gap-4 sm:grid-cols-2">
					<Field
						label={i18n.t('admin.settings.taglineDe')}
						name="taglineDe"
						optional
						value={v.taglineDe}
					/>
					<Field
						label={i18n.t('admin.settings.taglineEn')}
						name="taglineEn"
						optional
						value={v.taglineEn}
					/>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					{#each [{ name: 'primaryColor', label: 'admin.settings.primaryColor', ratio: primaryContrast }, { name: 'accentColor', label: 'admin.settings.accentColor', ratio: accentContrast }] as const as c (c.name)}
						<div class="space-y-1.5">
							<label for={c.name} class="text-sm font-medium">{i18n.t(c.label)}</label>
							<div class="flex gap-2">
								{#if c.name === 'primaryColor'}
									<input
										type="color"
										aria-label={i18n.t(c.label)}
										bind:value={primary}
										class="h-11 w-14 cursor-pointer rounded-lg border border-line bg-surface-raised p-1"
									/>
									<input
										id={c.name}
										name={c.name}
										bind:value={primary}
										class="h-11 w-full font-mono"
										maxlength="7"
									/>
								{:else}
									<input
										type="color"
										aria-label={i18n.t(c.label)}
										bind:value={accent}
										class="h-11 w-14 cursor-pointer rounded-lg border border-line bg-surface-raised p-1"
									/>
									<input
										id={c.name}
										name={c.name}
										bind:value={accent}
										class="h-11 w-full font-mono"
										maxlength="7"
									/>
								{/if}
							</div>
							{#if result?.errors?.[c.name]}
								<p class="text-sm text-red-600">{i18n.t('error.invalidColor')}</p>
							{:else if c.ratio < MIN_CONTRAST}
								<p class="text-sm text-amber-700 dark:text-amber-300">
									{i18n.t('admin.settings.contrastLow', { ratio: fmt(c.ratio) })}
								</p>
							{:else}
								<p class="text-sm text-ink-muted">
									{i18n.t('admin.settings.contrastOk', { ratio: fmt(c.ratio) })}
								</p>
							{/if}
						</div>
					{/each}
				</div>

				<div class="grid gap-4 sm:grid-cols-3">
					{#each images as img (img.field)}
						{@const src = imageSrc(img.field, data.current[img.column])}
						<div class="space-y-2">
							<label for={img.field} class="text-sm font-medium">{i18n.t(img.label)}</label>
							<div
								class="grid h-24 place-items-center overflow-hidden rounded-lg border border-dashed border-line bg-surface"
							>
								{#if src}<img
										{src}
										alt=""
										class="max-h-full max-w-full object-contain"
									/>{:else}<span class="text-xs text-ink-muted">—</span>{/if}
							</div>
							<input
								id={img.field}
								name={img.field}
								type="file"
								accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
								class="block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-brand-soft file:px-2 file:py-1 file:text-brand-text"
								onchange={(e) => pick(img.field, e)}
							/>
							{#if data.current[img.column]}
								<label class="flex items-center gap-2 text-xs text-ink-muted">
									<input
										type="checkbox"
										name="remove_{img.field}"
										bind:checked={removed[img.field]}
									/>
									{i18n.t('admin.settings.removeImage')}
								</label>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Live preview -->
			<div aria-label={i18n.t('admin.settings.preview')}>
				<p class="mb-2 text-sm font-medium text-ink-muted">{i18n.t('admin.settings.preview')}</p>
				<div
					class="relative overflow-hidden rounded-2xl border border-line"
					style="--brand:{safePrimary};--brand-fg:{readableTextColor(
						safePrimary
					)};--accent:{safeAccent};--accent-fg:{readableTextColor(safeAccent)}"
				>
					{#if imageSrc('background', data.current.backgroundAssetId)}
						<img
							src={imageSrc('background', data.current.backgroundAssetId)}
							alt=""
							class="absolute inset-0 size-full object-cover"
						/>
						<div class="absolute inset-0 bg-surface/70"></div>
					{/if}
					<div class="relative space-y-4 p-5">
						<div class="flex items-center gap-2 font-bold">
							{#if imageSrc('logo', data.current.logoAssetId)}
								<img
									src={imageSrc('logo', data.current.logoAssetId)}
									alt=""
									class="h-8 w-auto max-w-28 object-contain"
								/>
							{:else}
								<span
									class="grid size-8 place-items-center rounded-lg bg-brand text-sm text-brand-fg"
									>{festivalName.slice(0, 1).toUpperCase()}</span
								>
							{/if}
							<span class="truncate">{festivalName}</span>
						</div>
						<div class="rounded-xl border border-line bg-surface-raised p-4">
							<span class="rounded-sm bg-accent px-1.5 py-px text-xs font-semibold text-accent-fg"
								>+3</span
							>
							<p class="mt-2 text-sm font-semibold">Bar · 18:00–22:00</p>
							<p class="text-xs text-ink-muted">2 / 4</p>
							<span
								class="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg bg-brand text-sm font-semibold text-brand-fg"
								>{i18n.t('admin.settings.previewButton')}</span
							>
						</div>
					</div>
				</div>
			</div>
		</div>
	</Card>

	<Card title={i18n.t('admin.settings.booking')}>
		<div class="grid gap-4 sm:grid-cols-2">
			<Field
				label={i18n.t('admin.settings.cancelDeadlineHours')}
				name="cancelDeadlineHours"
				type="number"
				min="0"
				value={String(v.cancelDeadlineHours)}
				error={result?.errors?.cancelDeadlineHours}
			/>
			<Field
				label={i18n.t('admin.settings.minBreakMinutes')}
				name="minBreakMinutes"
				type="number"
				min="0"
				step="5"
				value={String(v.minBreakMinutes)}
				error={result?.errors?.minBreakMinutes}
			/>
			<Field
				label={i18n.t('admin.settings.reminderHours')}
				name="reminderHours"
				type="number"
				min="0"
				value={String(v.reminderHours)}
				hint={i18n.t('admin.settings.reminderHint')}
				error={result?.errors?.reminderHours}
			/>
			<label class="flex items-center gap-3 text-sm sm:col-span-2">
				<input
					type="checkbox"
					name="waitlistEnabled"
					checked={v.waitlistEnabled !== false && String(v.waitlistEnabled) !== 'false'}
					class="size-4"
				/>
				{i18n.t('admin.settings.waitlistEnabled')}
			</label>
		</div>
	</Card>

	<Card title={i18n.t('admin.points.title')} description={i18n.t('admin.settings.pointsLead')}>
		<div class="space-y-5">
			<div class="grid gap-4 sm:grid-cols-2">
				<Field
					label={i18n.t('admin.points.perShift')}
					name="pointsPerShift"
					type="number"
					min="0"
					value={String(v.pointsPerShift)}
					error={result?.errors?.pointsPerShift}
				/>
				<Field
					label={i18n.t('admin.points.perHour')}
					name="pointsPerHour"
					type="number"
					min="0"
					value={String(v.pointsPerHour)}
					error={result?.errors?.pointsPerHour}
				/>
			</div>
			<div class="grid gap-4 sm:grid-cols-3">
				<Field
					label={i18n.t('admin.settings.nightBonus')}
					name="nightBonus"
					type="number"
					min="0"
					value={String(v.nightBonus)}
					hint={i18n.t('admin.settings.bonusOff')}
					error={result?.errors?.nightBonus}
				/>
				<Field
					label={i18n.t('admin.settings.nightStart')}
					name="nightStart"
					type="time"
					value={v.nightStart}
					error={result?.errors?.nightStart}
				/>
				<Field
					label={i18n.t('admin.settings.nightEnd')}
					name="nightEnd"
					type="time"
					value={v.nightEnd}
					error={result?.errors?.nightEnd}
				/>
			</div>
			<div class="grid gap-4 sm:grid-cols-2">
				<Field
					label={i18n.t('admin.settings.lastMinuteBonus')}
					name="lastMinuteBonus"
					type="number"
					min="0"
					value={String(v.lastMinuteBonus)}
					hint={i18n.t('admin.settings.bonusOff')}
					error={result?.errors?.lastMinuteBonus}
				/>
				<Field
					label={i18n.t('admin.settings.lastMinuteHours')}
					name="lastMinuteHours"
					type="number"
					min="0"
					value={String(v.lastMinuteHours)}
					error={result?.errors?.lastMinuteHours}
				/>
			</div>
		</div>
	</Card>

	<Card title={i18n.t('admin.settings.maps')} description={i18n.t('admin.settings.mapHint')}>
		<div class="grid gap-4 sm:grid-cols-2">
			<Field
				label={i18n.t('admin.settings.mapTileUrl')}
				name="mapTileUrl"
				value={v.mapTileUrl}
				error={result?.errors?.mapTileUrl}
			/>
			<Field
				label={i18n.t('admin.settings.mapAttribution')}
				name="mapAttribution"
				optional
				value={v.mapAttribution}
			/>
		</div>
	</Card>

	<Card title={i18n.t('admin.settings.general')}>
		<div class="space-y-5">
			<label class="flex items-center gap-3">
				<input
					type="checkbox"
					name="registrationOpen"
					checked={String(v.registrationOpen) === 'true' ||
						v.registrationOpen === true ||
						String(v.registrationOpen) === 'on'}
					class="size-5"
				/>
				<span class="font-medium">{i18n.t('admin.settings.registrationOpen')}</span>
			</label>
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-1.5">
					<label for="defaultLocale" class="text-sm font-medium"
						>{i18n.t('admin.settings.defaultLocale')}</label
					>
					<select
						id="defaultLocale"
						name="defaultLocale"
						class="block h-11 w-full"
						value={v.defaultLocale}
					>
						{#each LOCALES as l (l)}<option value={l}>{i18n.t(`locale.${l}`)}</option>{/each}
					</select>
				</div>
				<Field
					label={i18n.t('admin.settings.timezone')}
					name="timezone"
					value={v.timezone}
					error={result?.errors?.timezone}
				/>
			</div>
			<Field
				label={i18n.t('admin.settings.contactEmail')}
				name="contactEmail"
				type="email"
				optional
				value={v.contactEmail}
				error={result?.errors?.contactEmail}
			/>
			<div class="grid gap-4 sm:grid-cols-2">
				<Field
					label={i18n.t('admin.settings.imprintUrl')}
					name="imprintUrl"
					type="url"
					optional
					placeholder="https://"
					value={v.imprintUrl}
					error={result?.errors?.imprintUrl}
				/>
				<Field
					label={i18n.t('admin.settings.privacyUrl')}
					name="privacyUrl"
					type="url"
					optional
					placeholder="https://"
					value={v.privacyUrl}
					error={result?.errors?.privacyUrl}
				/>
			</div>
		</div>
	</Card>

	<div
		class="sticky bottom-0 -mx-4 border-t border-line bg-surface/95 px-4 py-3 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0"
	>
		<Button type="submit" size="lg" loading={submitter.pending}>{i18n.t('common.save')}</Button>
	</div>
</form>
