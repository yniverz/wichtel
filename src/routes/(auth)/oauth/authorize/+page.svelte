<script lang="ts">
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import Button from '#lib/components/Button.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
</script>

<svelte:head
	><title>{i18n.t('mcp.consent.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<div class="space-y-6">
	<h1 class="font-display text-4xl">{i18n.t('mcp.consent.title')}</h1>
	{#if !data.ok}
		<Alert tone="error">{i18n.t('mcp.consent.invalid')} ({data.error})</Alert>
	{:else if !data.allowed}
		<Alert tone="error">{i18n.t('mcp.consent.notAllowed')}</Alert>
		<form method="POST">
			{#each data.params as [name, value] (name)}<input type="hidden" {name} {value} />{/each}
			<Button type="submit" name="decision" value="deny" variant="secondary" block
				>{i18n.t('common.back')}</Button
			>
		</form>
	{:else}
		<p>
			{i18n.t('mcp.consent.lead', {
				client: data.clientName,
				user: `${page.data.user?.firstName} ${page.data.user?.lastName}`
			})}
		</p>
		<p class="rounded-md border border-line p-3 text-sm">
			{i18n.t('mcp.consent.redirect')}<strong class="font-mono break-all"
				>{data.redirectHost}</strong
			>
			<span class="mt-1 block text-ink-muted">{i18n.t('mcp.consent.nameHint')}</span>
		</p>
		{#if form?.error}<Alert tone="error">{form.error}</Alert>{/if}
		<form method="POST" class="space-y-5">
			{#each data.params as [name, value] (name)}<input type="hidden" {name} {value} />{/each}
			<fieldset class="space-y-2">
				<legend class="mb-1 text-sm font-bold">{i18n.t('mcp.consent.access')}</legend>
				<label class="flex items-start gap-3 rounded-md border border-line p-3">
					<input type="radio" name="access" value="write" checked class="mt-1 size-4" />
					<span>
						<span class="block font-semibold">{i18n.t('mcp.scope.write')}</span>
						<span class="block text-sm text-ink-muted">{i18n.t('mcp.scope.writeHint')}</span>
					</span>
				</label>
				<label class="flex items-start gap-3 rounded-md border border-line p-3">
					<input type="radio" name="access" value="read" class="mt-1 size-4" />
					<span>
						<span class="block font-semibold">{i18n.t('mcp.scope.read')}</span>
						<span class="block text-sm text-ink-muted">{i18n.t('mcp.scope.readHint')}</span>
					</span>
				</label>
			</fieldset>
			<p class="text-sm text-ink-muted">{i18n.t('mcp.consent.note')}</p>
			<div class="flex flex-col gap-2 sm:flex-row">
				<Button type="submit" name="decision" value="allow" size="lg"
					>{i18n.t('mcp.consent.allow')}</Button
				>
				<Button type="submit" name="decision" value="deny" variant="secondary" size="lg"
					>{i18n.t('mcp.consent.deny')}</Button
				>
			</div>
		</form>
	{/if}
</div>
