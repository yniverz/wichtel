<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { getI18n } from '#lib/i18n/context.ts';
	import { isMessageKey } from '#lib/i18n/index.ts';

	type Props = {
		label: string;
		name: string;
		hint?: string;
		/** Message key of a validation error. */
		error?: string;
		optional?: boolean;
		value?: string | number | null;
	} & Omit<HTMLInputAttributes, 'name' | 'value'>;

	let {
		label,
		name,
		hint,
		error,
		optional = false,
		value = $bindable(''),
		type = 'text',
		id,
		...rest
	}: Props = $props();

	const i18n = getI18n();
	const inputId = $derived(id ?? `field-${name}`);
	const describedBy = $derived(
		[error ? `${inputId}-error` : '', hint ? `${inputId}-hint` : ''].filter(Boolean).join(' ') ||
			undefined
	);
</script>

<div class="space-y-1.5">
	<label for={inputId} class="flex items-baseline justify-between text-sm font-medium">
		<span>{label}</span>
		{#if optional}<span class="text-xs font-normal text-ink-muted">{i18n.t('common.optional')}</span
			>{/if}
	</label>
	<input
		id={inputId}
		{name}
		{type}
		bind:value
		required={!optional}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={describedBy}
		class="block h-11 w-full {error
			? 'border-red-500 focus:border-red-500 focus:ring-red-500'
			: ''}"
		{...rest}
	/>
	{#if error}
		<p id="{inputId}-error" class="text-sm text-red-600 dark:text-red-400">
			{isMessageKey(error) ? i18n.t(error) : error}
		</p>
	{:else if hint}
		<p id="{inputId}-hint" class="text-sm text-ink-muted">{hint}</p>
	{/if}
</div>
