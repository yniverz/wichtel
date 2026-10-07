<script lang="ts">
	import { page } from '$app/state';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import FieldForm from '#lib/components/admin/FieldForm.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import { localized, type MessageKey } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	type Result = {
		action?: string;
		error?: string;
		success?: string;
		errors?: Record<string, string>;
	};
	const result = $derived(form as Result | null);
	const empty = {
		labelDe: '',
		labelEn: '',
		helpDe: '',
		helpEn: '',
		type: 'text',
		options: [],
		required: false,
		context: 'profile',
		goodieIds: [],
		showToLeads: false,
		active: true,
		sortOrder: 0
	};
</script>

<svelte:head
	><title>{i18n.t('admin.fields.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader title={i18n.t('admin.fields.title')} lead={i18n.t('admin.fields.lead')} />

<div class="max-w-3xl space-y-3">
	{#if data.fields.length === 0}<p class="text-ink-muted">{i18n.t('admin.fields.empty')}</p>{/if}
	{#each data.fields as f (f.id)}
		<details
			class="rounded-md border border-line bg-surface-raised"
			open={result?.action === f.id && !!result.errors}
		>
			<summary class="flex cursor-pointer flex-wrap items-baseline gap-x-3 px-4 py-3">
				<span class="font-semibold">{localized(f, 'label', i18n.locale)}</span>
				<span class="text-sm text-ink-muted">
					{i18n.t(`admin.fields.type.${f.type}` as MessageKey)} · {i18n.t(
						`admin.fields.context.${f.context}` as MessageKey
					)}{#if f.required}
						· {i18n.t('admin.fields.required')}{/if}{#if !f.active}
						· {i18n.t('admin.goodies.inactive')}{/if}
				</span>
			</summary>
			<div class="border-t border-line p-4">
				<FieldForm
					values={f}
					goodies={data.goodies}
					result={result?.action === f.id ? result : null}
					submitLabel={i18n.t('common.save')}
				/>
			</div>
		</details>
	{/each}
	<details
		class="rounded-md border border-dashed border-line"
		open={data.fields.length === 0 || result?.action === 'new'}
	>
		<summary class="cursor-pointer px-4 py-3 font-semibold text-brand-text"
			>+ {i18n.t('admin.fields.new')}</summary
		>
		<div class="border-t border-line p-4">
			<FieldForm
				values={empty}
				goodies={data.goodies}
				result={result?.action === 'new' ? result : null}
				submitLabel={i18n.t('common.create')}
			/>
		</div>
	</details>
</div>
