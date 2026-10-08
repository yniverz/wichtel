<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import Field from '#lib/components/Field.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const submitter = pendingForm({ reset: false });
	type Result = {
		success?: string;
		errors?: Record<string, string>;
		values?: Record<string, string>;
	};
	const result = $derived(form as Result | null);
	const v = $derived({ ...data.current, ...(result?.values ?? {}) } as typeof data.current &
		Record<string, string>);

	// Editable locally; the saved value is the starting point (writable derived).
	let privacyDe = $derived(v.privacyDe);
	let privacyEn = $derived(v.privacyEn);

	function insertTemplate(locale: 'de' | 'en') {
		const current = locale === 'de' ? privacyDe : privacyEn;
		if (current.trim() && !confirm(i18n.t('admin.legal.replaceConfirm'))) return;
		if (locale === 'de') privacyDe = data.template.de;
		else privacyEn = data.template.en;
	}
	const openTodos = (text: string) =>
		(text.match(/\[(Bitte ergänzen|Please complete)[^\]]*\]/g) ?? []).length;

	const textarea =
		'block w-full rounded-md border-line bg-surface font-mono text-sm leading-relaxed';
</script>

<svelte:head
	><title>{i18n.t('admin.legal.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader title={i18n.t('admin.legal.title')} lead={i18n.t('admin.legal.lead')} />

<form method="POST" class="max-w-3xl space-y-8" use:enhance={submitter.submit} novalidate>
	<FormMessage success={result?.success} />

	<Card title={i18n.t('admin.legal.operator')} description={i18n.t('admin.legal.operatorLead')}>
		<div class="space-y-4">
			<Field
				label={i18n.t('admin.legal.name')}
				name="legalName"
				value={v.legalName}
				hint={i18n.t('admin.legal.nameHint')}
				error={result?.errors?.legalName}
			/>
			<div class="space-y-1.5">
				<label for="legalAddress" class="text-sm font-medium">{i18n.t('admin.legal.address')}</label
				>
				<textarea id="legalAddress" name="legalAddress" rows="3" class={textarea}
					>{v.legalAddress}</textarea
				>
			</div>
			<div class="space-y-1.5">
				<label for="legalRepresentative" class="flex justify-between text-sm font-medium"
					><span>{i18n.t('admin.legal.representative')}</span><span
						class="text-xs font-normal text-ink-muted">{i18n.t('common.optional')}</span
					></label
				>
				<textarea id="legalRepresentative" name="legalRepresentative" rows="2" class={textarea}
					>{v.legalRepresentative}</textarea
				>
				<p class="text-sm text-ink-muted">{i18n.t('admin.legal.representativeHint')}</p>
			</div>
			<div class="grid gap-4 sm:grid-cols-2">
				<Field
					label={i18n.t('admin.legal.email')}
					name="legalEmail"
					type="email"
					value={v.legalEmail}
					error={result?.errors?.legalEmail}
				/>
				<Field
					label={i18n.t('admin.legal.phone')}
					name="legalPhone"
					type="tel"
					value={v.legalPhone}
					hint={i18n.t('admin.legal.phoneHint')}
					error={result?.errors?.legalPhone}
				/>
				<Field
					label={i18n.t('admin.legal.register')}
					name="legalRegister"
					optional
					placeholder="Amtsgericht …, VR 12345"
					value={v.legalRegister}
					error={result?.errors?.legalRegister}
				/>
				<Field
					label={i18n.t('admin.legal.vatId')}
					name="legalVatId"
					optional
					value={v.legalVatId}
					error={result?.errors?.legalVatId}
				/>
			</div>
			<div class="grid gap-4 sm:grid-cols-2">
				{#each [['imprintExtraDe', 'admin.legal.extraDe'], ['imprintExtraEn', 'admin.legal.extraEn']] as const as [name, label] (name)}
					<div class="space-y-1.5">
						<label for={name} class="flex justify-between text-sm font-medium"
							><span>{i18n.t(label)}</span><span class="text-xs font-normal text-ink-muted"
								>{i18n.t('common.optional')}</span
							></label
						>
						<textarea id={name} {name} rows="3" class={textarea}>{v[name]}</textarea>
					</div>
				{/each}
			</div>
			<p class="text-sm text-ink-muted">{i18n.t('admin.legal.markdownHint')}</p>
		</div>
	</Card>

	<Card title={i18n.t('admin.legal.privacy')} description={i18n.t('admin.legal.privacyLead')}>
		<div class="space-y-5">
			<Alert tone="warning">{i18n.t('admin.legal.templateWarning')}</Alert>
			<div class="space-y-1.5">
				<label for="privacyOfficer" class="flex justify-between text-sm font-medium"
					><span>{i18n.t('admin.legal.officer')}</span><span
						class="text-xs font-normal text-ink-muted">{i18n.t('common.optional')}</span
					></label
				>
				<textarea id="privacyOfficer" name="privacyOfficer" rows="2" class={textarea}
					>{v.privacyOfficer}</textarea
				>
				<p class="text-sm text-ink-muted">{i18n.t('admin.legal.officerHint')}</p>
			</div>
			{#each [['de', 'privacyDe', 'admin.legal.privacyDe'], ['en', 'privacyEn', 'admin.legal.privacyEn']] as const as [locale, name, label] (name)}
				{@const text = locale === 'de' ? privacyDe : privacyEn}
				<div class="space-y-1.5">
					<div class="flex flex-wrap items-baseline justify-between gap-2">
						<label for={name} class="text-sm font-medium">{i18n.t(label)}</label>
						<Button
							type="button"
							variant="secondary"
							size="sm"
							onclick={() => insertTemplate(locale)}>{i18n.t('admin.legal.insertTemplate')}</Button
						>
					</div>
					{#if locale === 'de'}
						<textarea id={name} {name} rows="16" class={textarea} bind:value={privacyDe}></textarea>
					{:else}
						<textarea id={name} {name} rows="16" class={textarea} bind:value={privacyEn}></textarea>
					{/if}
					{#if openTodos(text)}
						<p class="text-sm font-semibold text-brand-text">
							{i18n.t('admin.legal.todos', { count: openTodos(text) })}
						</p>
					{/if}
				</div>
			{/each}
			<p class="text-sm text-ink-muted">{i18n.t('admin.legal.templateHint')}</p>
		</div>
	</Card>

	<Card title={i18n.t('admin.legal.retention')} description={i18n.t('admin.legal.retentionLead')}>
		<div class="grid gap-4 sm:grid-cols-2">
			<Field
				label={i18n.t('admin.legal.retentionMonths')}
				name="retentionMonths"
				type="number"
				min="0"
				max="240"
				value={String(v.retentionMonths)}
				hint={i18n.t('admin.legal.retentionMonthsHint')}
				error={result?.errors?.retentionMonths}
			/>
			<Field
				label={i18n.t('admin.legal.auditIpDays')}
				name="auditIpDays"
				type="number"
				min="1"
				value={String(v.auditIpDays)}
				hint={i18n.t('admin.legal.auditIpDaysHint')}
				error={result?.errors?.auditIpDays}
			/>
		</div>
	</Card>

	<Card title={i18n.t('admin.legal.external')} description={i18n.t('admin.legal.externalLead')}>
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
	</Card>

	<div
		class="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-4 border-t border-line bg-surface/95 px-4 py-3 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0"
	>
		<Button type="submit" size="lg" loading={submitter.pending}>{i18n.t('common.save')}</Button>
		{#if page.data.settings.hasImprint}<a href="/legal/imprint" class="text-sm underline"
				>{i18n.t('footer.imprint')} ↗</a
			>{/if}
		{#if page.data.settings.hasPrivacy}<a href="/legal/privacy" class="text-sm underline"
				>{i18n.t('legal.privacyTitle')} ↗</a
			>{/if}
	</div>
</form>
