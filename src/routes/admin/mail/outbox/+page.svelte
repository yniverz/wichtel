<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDateTime } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const result = $derived(form as { error?: string; success?: string } | null);
	let selected: string[] = $state([]);
	const allSelected = $derived(data.mails.length > 0 && selected.length === data.mails.length);
	const tz = $derived(page.data.settings.timezone);
</script>

<svelte:head
	><title>{i18n.t('admin.outbox.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader title={i18n.t('admin.outbox.title')} lead={i18n.t('admin.outbox.lead')} />

<div class="max-w-4xl space-y-8">
	{#if !data.mailServer}
		<Alert tone="warning">{i18n.t('admin.outbox.noServer')}</Alert>
	{/if}

	<dl class="flex flex-wrap gap-x-12 gap-y-4">
		{#each [['admin.outbox.pending', data.status.pending, false], ['admin.outbox.retrying', data.status.retrying, false], ['admin.outbox.failed', data.status.failed, data.status.failed > 0]] as const as [label, value, alarm] (label)}
			<div>
				<dt class="text-sm text-ink-muted">{i18n.t(label)}</dt>
				<dd class="font-display text-5xl tabular-nums {alarm ? 'text-brand-text' : ''}">
					{value}
				</dd>
			</div>
		{/each}
	</dl>

	<FormMessage error={result?.error} success={result?.success} />

	{#if data.mails.length === 0}
		<p class="border-t border-line py-4 text-ink-muted">{i18n.t('admin.outbox.none')}</p>
	{:else}
		<form
			method="POST"
			use:enhance={() =>
				async ({ update }) => {
					await update();
					selected = [];
				}}
		>
			<div class="flex flex-wrap items-center gap-3 border-b-2 border-ink pb-2">
				<label class="flex items-center gap-2 text-sm font-semibold">
					<input
						type="checkbox"
						class="size-4"
						checked={allSelected}
						onchange={(e) =>
							(selected = e.currentTarget.checked ? data.mails.map((m) => m.id) : [])}
					/>
					{i18n.t('admin.outbox.selectAll')}
				</label>
				<span class="ml-auto flex gap-2">
					<Button type="submit" size="sm" formaction="?/retry" disabled={selected.length === 0}
						>{i18n.t('admin.outbox.retry')}</Button
					>
					<Button
						type="submit"
						size="sm"
						variant="secondary"
						formaction="?/discard"
						disabled={selected.length === 0}>{i18n.t('admin.outbox.discard')}</Button
					>
				</span>
			</div>
			<ul class="divide-y divide-line">
				{#each data.mails as mail (mail.id)}
					<li class="flex gap-3 py-3">
						<input
							type="checkbox"
							name="ids[]"
							value={mail.id}
							class="mt-1 size-4 shrink-0"
							aria-label={mail.subject}
							bind:group={selected}
						/>
						<div class="min-w-0 flex-1 space-y-1">
							<p class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
								<span class="font-semibold">{mail.subject}</span>
								{#if mail.nextTry}
									<Badge tone="warning"
										>{i18n.t('admin.outbox.nextTry', {
											time: formatDateTime(new Date(mail.nextTry), i18n.locale, tz)
										})}</Badge
									>
								{:else}
									<Badge tone="urgent">{i18n.t('admin.outbox.gaveUp')}</Badge>
								{/if}
							</p>
							<p class="text-sm break-all text-ink-muted">
								{mail.to} · {formatDateTime(new Date(mail.createdAt), i18n.locale, tz)} · {i18n.t(
									'admin.outbox.attempts',
									{ count: mail.attempts }
								)}
							</p>
							{#if mail.lastError}
								<p class="font-mono text-xs break-all text-ink-muted">{mail.lastError}</p>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		</form>
	{/if}
</div>
