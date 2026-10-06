<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
	type Props = {
		variant?: Variant;
		size?: 'sm' | 'md' | 'lg';
		block?: boolean;
		loading?: boolean;
		children: Snippet;
	} & (
		| ({ href: string } & Omit<HTMLAnchorAttributes, 'children'>)
		| ({ href?: undefined } & Omit<HTMLButtonAttributes, 'children'>)
	);

	let {
		variant = 'primary',
		size = 'md',
		block = false,
		loading = false,
		children,
		class: className = '',
		...rest
	}: Props = $props();

	const variants: Record<Variant, string> = {
		primary:
			'bg-brand text-brand-fg hover:bg-[color-mix(in_oklab,var(--brand)_86%,black)] active:translate-y-px',
		secondary:
			'bg-surface-raised text-ink border border-ink/25 hover:border-ink active:translate-y-px',
		ghost: 'text-ink hover:bg-ink/6',
		danger: 'bg-red-700 text-white hover:bg-red-800 active:translate-y-px'
	};
	const sizes = {
		sm: 'h-9 px-3 text-sm gap-1.5',
		md: 'h-11 px-4 text-sm gap-2',
		lg: 'h-12 px-5 text-base gap-2'
	};

	const classes = $derived(
		[
			'inline-flex items-center justify-center rounded-md font-semibold transition-colors select-none',
			'disabled:opacity-50 disabled:pointer-events-none',
			variants[variant],
			sizes[size],
			block ? 'w-full' : '',
			className
		].join(' ')
	);
</script>

{#if rest.href !== undefined}
	<a class={classes} {...rest as HTMLAnchorAttributes}>{@render children()}</a>
{:else}
	<button
		class={classes}
		{...rest as HTMLButtonAttributes}
		disabled={loading || (rest as HTMLButtonAttributes).disabled}
		aria-busy={loading}
	>
		{#if loading}
			<span
				class="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
				aria-hidden="true"
			></span>
		{/if}
		{@render children()}
	</button>
{/if}
