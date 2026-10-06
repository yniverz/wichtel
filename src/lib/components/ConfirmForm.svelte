<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import { getI18n } from '#lib/i18n/context.ts';
	import Button from './Button.svelte';

	/**
	 * A POST form whose submit button first asks for confirmation in a dialog. Used for all
	 * destructive or hard-to-undo actions, so confirmation always looks and works the same.
	 */
	let {
		action,
		message,
		confirmLabel,
		variant = 'danger',
		size = 'sm',
		hidden = {},
		children
	}: {
		action: string;
		message: string;
		confirmLabel?: string;
		variant?: 'danger' | 'primary' | 'secondary' | 'ghost';
		size?: 'sm' | 'md';
		hidden?: Record<string, string>;
		children: Snippet;
	} = $props();

	const i18n = getI18n();
	let dialog: HTMLDialogElement | undefined = $state();
</script>

<form method="POST" {action} use:enhance class="inline">
	{#each Object.entries(hidden) as [name, value] (name)}
		<input type="hidden" {name} {value} />
	{/each}
	<Button type="button" {variant} {size} onclick={() => dialog?.showModal()}>
		{@render children()}
	</Button>
	<dialog
		bind:this={dialog}
		class="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-ink/20 bg-surface-raised p-0 text-ink shadow-[0_20px_60px_-20px_rgb(0_0_0/0.45)] backdrop:bg-ink/50"
	>
		<div class="space-y-5 p-5">
			<p class="text-base">{message}</p>
			<div class="flex justify-end gap-2">
				<Button type="button" variant="secondary" onclick={() => dialog?.close()}>
					{i18n.t('common.cancel')}
				</Button>
				<Button type="submit" {variant} onclick={() => dialog?.close()}>
					{confirmLabel ?? i18n.t('common.confirm')}
				</Button>
			</div>
		</div>
	</dialog>
</form>
