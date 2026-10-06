<script lang="ts">
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = getI18n();
	const loggedIn = $derived(Boolean(page.data.user));
</script>

<div class="space-y-6">
	{#if data.verified}
		<h1 class="font-display text-4xl">{i18n.t('auth.verify.success')}</h1>
		<Button href={loggedIn ? '/app' : '/login'} block size="lg">
			{loggedIn ? i18n.t('landing.toApp') : i18n.t('nav.login')}
		</Button>
	{:else}
		<Alert tone="error">{i18n.t('auth.verify.invalid')}</Alert>
		<Button href={loggedIn ? '/app' : '/login'} variant="secondary" block>
			{loggedIn ? i18n.t('landing.toApp') : i18n.t('nav.login')}
		</Button>
	{/if}
</div>
