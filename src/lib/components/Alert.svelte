<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		tone = 'info',
		children
	}: { tone?: 'info' | 'success' | 'error' | 'warning'; children: Snippet } = $props();

	const tones = {
		info: 'border-line bg-surface-raised text-ink',
		success:
			'border-emerald-700/30 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-100',
		error: 'border-red-700/30 bg-red-50 text-red-950 dark:bg-red-950/50 dark:text-red-100',
		warning: 'border-accent bg-accent/20 text-ink'
	};
	const marks = { info: 'i', success: '✓', error: '!', warning: '!' };
</script>

<div
	class="flex gap-3 rounded-md border px-3.5 py-3 text-sm {tones[tone]}"
	role={tone === 'error' ? 'alert' : 'status'}
>
	<span class="font-bold" aria-hidden="true">{marks[tone]}</span>
	<div class="min-w-0">{@render children()}</div>
</div>
