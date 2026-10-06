<script lang="ts">
	import { getI18n } from '#lib/i18n/context.ts';
	import { isMessageKey } from '#lib/i18n/index.ts';
	import Alert from './Alert.svelte';

	/** Shows a form-level error or success message given as message key. */
	let { error, success }: { error?: unknown; success?: unknown } = $props();
	const i18n = getI18n();
</script>

{#if typeof error === 'string' && isMessageKey(error)}
	<Alert tone="error">{i18n.t(error)}</Alert>
{:else if typeof success === 'string' && isMessageKey(success)}
	<Alert tone="success">{i18n.t(success)}</Alert>
{/if}
