<script lang="ts">
	import { assetUrl } from '#lib/assets.ts';

	/**
	 * The festival's background image, fixed behind the whole viewport (like a poster the page
	 * sits on). Anchored to the bottom, because festival artwork usually has its landscape there.
	 */
	let { assetId }: { assetId: string | null | undefined } = $props();
</script>

{#if assetId}
	<div aria-hidden="true" class="pointer-events-none fixed inset-0 -z-10 bg-surface">
		<img src={assetUrl(assetId)} alt="" class="size-full object-cover object-bottom" />
	</div>
{/if}
