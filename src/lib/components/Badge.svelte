<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		tone = 'neutral',
		children
	}: {
		tone?: 'neutral' | 'brand' | 'warning' | 'success' | 'urgent';
		children: Snippet;
	} = $props();

	const tones = {
		neutral: 'border border-line text-ink-muted',
		brand: 'bg-brand text-brand-fg',
		warning: 'bg-accent text-accent-fg',
		success: 'border border-emerald-700/40 text-emerald-800 dark:text-emerald-300',
		urgent: 'border border-brand text-brand-text uppercase tracking-wide'
	};
</script>

<span
	class="inline-flex items-center rounded-sm px-1.5 py-px text-xs font-semibold whitespace-nowrap {tones[
		tone
	]}">{@render children()}</span
>
