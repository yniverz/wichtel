<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '#lib/components/Button.svelte';
	import Field from '#lib/components/Field.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { localized, type MessageKey } from '#lib/i18n/index.ts';

	type Values = {
		id?: string;
		labelDe: string;
		labelEn: string;
		helpDe: string;
		helpEn: string;
		type: string;
		options: string[];
		required: boolean;
		context: string;
		goodieIds: string[];
		showToLeads: boolean;
		active: boolean;
		sortOrder: number;
	};
	let {
		values,
		goodies,
		result,
		submitLabel
	}: {
		values: Values;
		goodies: { id: string; nameDe: string; nameEn: string }[];
		result?: { error?: string; success?: string; errors?: Record<string, string> } | null;
		submitLabel: string;
	} = $props();
	const i18n = getI18n();
	// svelte-ignore state_referenced_locally
	const submitter = pendingForm({ reset: !values.id });
	// svelte-ignore state_referenced_locally
	let type = $state(values.type);
	// svelte-ignore state_referenced_locally
	let context = $state(values.context);
	const key = $derived(values.id ?? 'new');
	const e = $derived(result?.errors ?? {});
	const types = [
		'text',
		'textarea',
		'number',
		'date',
		'select',
		'multiselect',
		'checkbox'
	] as const;
	const contexts = ['registration', 'profile', 'goodie'] as const;
</script>

<form method="POST" action="?/save" class="space-y-4" use:enhance={submitter.submit}>
	<FormMessage error={result?.error} success={result?.success} />
	{#if values.id}<input type="hidden" name="id" value={values.id} />{/if}
	<div class="grid gap-4 sm:grid-cols-2">
		<Field
			id="lde-{key}"
			label={i18n.t('admin.fields.labelDe')}
			name="labelDe"
			value={values.labelDe}
			error={e.labelDe}
		/>
		<Field
			id="len-{key}"
			label={i18n.t('admin.fields.labelEn')}
			name="labelEn"
			optional
			value={values.labelEn}
		/>
		<Field
			id="hde-{key}"
			label={i18n.t('admin.fields.helpDe')}
			name="helpDe"
			optional
			value={values.helpDe}
		/>
		<Field
			id="hen-{key}"
			label={i18n.t('admin.fields.helpEn')}
			name="helpEn"
			optional
			value={values.helpEn}
		/>
	</div>
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-1.5">
			<label class="text-sm font-medium" for="type-{key}">{i18n.t('admin.fields.type')}</label>
			<select id="type-{key}" name="type" class="block h-11 w-full" bind:value={type}>
				{#each types as t (t)}<option value={t}
						>{i18n.t(`admin.fields.type.${t}` as MessageKey)}</option
					>{/each}
			</select>
		</div>
		{#if type === 'select' || type === 'multiselect'}
			<Field
				id="opt-{key}"
				label={i18n.t('admin.fields.options')}
				name="options"
				hint={i18n.t('admin.fields.optionsHint')}
				value={values.options.join(', ')}
				error={e.options}
			/>
		{/if}
	</div>
	<fieldset class="space-y-2">
		<legend class="text-sm font-medium">{i18n.t('admin.fields.context')}</legend>
		{#each contexts as c (c)}
			<label class="flex items-center gap-3 text-sm">
				<input
					type="radio"
					name="context"
					value={c}
					bind:group={context}
					class="size-4 border-ink/40 text-brand focus:ring-brand"
				/>
				{i18n.t(`admin.fields.context.${c}` as MessageKey)}
			</label>
		{/each}
		{#if context === 'goodie'}
			<div class="ml-7 flex flex-wrap gap-x-5 gap-y-1.5">
				{#each goodies as g (g.id)}
					<label class="flex items-center gap-2 text-sm"
						><input
							type="checkbox"
							name="goodieIds[]"
							value={g.id}
							checked={values.goodieIds.includes(g.id)}
							class="size-4"
						/>{localized(g, 'name', i18n.locale)}</label
					>
				{/each}
			</div>
		{/if}
	</fieldset>
	<div class="flex flex-wrap items-center gap-x-6 gap-y-2">
		<label class="flex items-center gap-3 text-sm"
			><input type="checkbox" name="required" checked={values.required} class="size-4" />{i18n.t(
				'admin.fields.required'
			)}</label
		>
		<label class="flex items-center gap-3 text-sm"
			><input
				type="checkbox"
				name="showToLeads"
				checked={values.showToLeads}
				class="size-4"
			/>{i18n.t('admin.fields.showToLeads')}</label
		>
		<label class="flex items-center gap-3 text-sm"
			><input type="checkbox" name="active" checked={values.active} class="size-4" />{i18n.t(
				'admin.fields.active'
			)}</label
		>
		<input type="hidden" name="sortOrder" value={values.sortOrder} />
	</div>
	<Button type="submit" loading={submitter.pending}>{submitLabel}</Button>
</form>
