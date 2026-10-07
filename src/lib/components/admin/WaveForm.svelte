<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '#lib/components/Button.svelte';
	import Field from '#lib/components/Field.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { localized, type MessageKey } from '#lib/i18n/index.ts';

	let {
		values,
		areas,
		result,
		submitLabel
	}: {
		values: {
			id?: string;
			name: string;
			opensDate: string;
			opensTime: string;
			closesDate: string;
			closesTime: string;
			areaIds: string[];
			audience: string;
		};
		areas: { id: string; nameDe: string; nameEn: string; depth: number }[];
		result?: { error?: string; success?: string; errors?: Record<string, string> } | null;
		submitLabel: string;
	} = $props();
	const i18n = getI18n();
	// svelte-ignore state_referenced_locally
	const submitter = pendingForm({ reset: !values.id });
	const key = $derived(values.id ?? 'new');
	const e = $derived(result?.errors ?? {});
	const audiences = ['everyone', 'crew', 'returning', 'invite'] as const;
</script>

<form method="POST" action="?/save" class="space-y-4" use:enhance={submitter.submit}>
	<FormMessage error={result?.error} success={result?.success} />
	{#if values.id}<input type="hidden" name="id" value={values.id} />{/if}
	<Field
		id="name-{key}"
		label={i18n.t('admin.waves.name')}
		name="name"
		placeholder={i18n.t('admin.waves.namePlaceholder')}
		value={values.name}
		error={e.name}
	/>
	<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
		<Field
			id="od-{key}"
			label={i18n.t('admin.waves.opensAt')}
			name="opensDate"
			type="date"
			value={values.opensDate}
			error={e.opensDate}
		/>
		<Field
			id="ot-{key}"
			label={i18n.t('admin.waves.time')}
			name="opensTime"
			type="time"
			value={values.opensTime}
			error={e.opensTime}
		/>
		<Field
			id="cd-{key}"
			label={i18n.t('admin.waves.closesAt')}
			name="closesDate"
			type="date"
			optional
			value={values.closesDate}
			hint={i18n.t('admin.waves.closesHint')}
			error={e.closesDate ?? e.closesAt}
		/>
		<Field
			id="ct-{key}"
			label={i18n.t('admin.waves.time')}
			name="closesTime"
			type="time"
			optional
			value={values.closesTime}
		/>
	</div>
	<fieldset class="space-y-1.5">
		<legend class="text-sm font-medium">{i18n.t('admin.waves.audience')}</legend>
		{#each audiences as a (a)}
			<label class="flex items-center gap-3 text-sm">
				<input
					type="radio"
					name="audience"
					value={a}
					checked={values.audience === a}
					class="size-4 border-ink/40 text-brand focus:ring-brand"
				/>
				{i18n.t(`admin.waves.audience.${a}` as MessageKey)}
			</label>
		{/each}
	</fieldset>
	{#if areas.length}
		<fieldset>
			<legend class="text-sm font-medium">{i18n.t('admin.waves.areas')}</legend>
			<p class="mb-2 text-sm text-ink-muted">{i18n.t('admin.waves.areasHint')}</p>
			<div class="grid gap-1 sm:grid-cols-2">
				{#each areas as a (a.id)}
					<label class="flex items-center gap-3 text-sm" style="padding-left: {a.depth * 1.25}rem">
						<input
							type="checkbox"
							name="areaIds[]"
							value={a.id}
							checked={values.areaIds.includes(a.id)}
							class="size-4"
						/>
						{localized(a, 'name', i18n.locale)}
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}
	<Button type="submit" loading={submitter.pending}>{submitLabel}</Button>
</form>
