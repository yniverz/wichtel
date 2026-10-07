<script lang="ts">
	/**
	 * The festival's own site plan with a pin. Entirely local – no external services.
	 * With `onpick`, clicking the plan moves the pin.
	 */
	let {
		src,
		x,
		y,
		label = '',
		onpick
	}: {
		src: string;
		x: number | null;
		y: number | null;
		label?: string;
		onpick?: (pos: { x: number; y: number }) => void;
	} = $props();

	function pick(e: MouseEvent) {
		if (!onpick) return;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const clamp = (v: number) => Math.min(1, Math.max(0, v));
		onpick({
			x: Number(clamp((e.clientX - rect.left) / rect.width).toFixed(4)),
			y: Number(clamp((e.clientY - rect.top) / rect.height).toFixed(4))
		});
	}
</script>

<div class="relative w-full overflow-hidden rounded-md border border-line bg-white">
	{#if onpick}
		<button type="button" class="block w-full cursor-crosshair" onclick={pick} aria-label={label}>
			<img {src} alt="" class="block w-full select-none" draggable="false" />
		</button>
	{:else}
		<img {src} alt={label} class="block w-full select-none" draggable="false" />
	{/if}
	{#if x !== null && y !== null}
		<span
			class="pointer-events-none absolute -translate-x-1/2 -translate-y-full"
			style="left: {x * 100}%; top: {y * 100}%"
			aria-hidden="true"
		>
			<span
				class="block size-7 -rotate-45 rounded-[50%_50%_50%_0] border-[3px] border-white bg-brand shadow-[0_2px_6px_rgb(0_0_0/0.45)]"
			></span>
		</span>
	{/if}
</div>
