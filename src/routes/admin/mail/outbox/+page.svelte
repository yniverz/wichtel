<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDateTime } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const result = $derived(
		form as {
			error?: string;
			success?: string;
			testSent?: string;
			viaServer?: boolean;
			testFailed?: string;
		} | null
	);
	let selected: string[] = $state([]);
	const testForm = pendingForm({ reset: false });
	const stateTone = {
		sent: 'success',
		queued: 'neutral',
		retrying: 'warning',
		failed: 'urgent'
	} as const;
	const logLink = (p: number) =>
		`?${new URLSearchParams({ ...(data.log.q ? { q: data.log.q } : {}), page: String(p) })}#log`;
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

	<section aria-labelledby="test" class="space-y-3 border-y border-line py-4">
		<h2 id="test" class="text-sm font-bold">{i18n.t('admin.outbox.testTitle')}</h2>
		<p class="text-sm text-ink-muted">
			{i18n.t('admin.outbox.testLead', { email: page.data.user?.email ?? '' })}
		</p>
		<form method="POST" action="?/testMail" use:enhance={testForm.submit}>
			<Button type="submit" variant="secondary" size="sm" loading={testForm.pending}
				>{i18n.t('admin.outbox.testSend')}</Button
			>
		</form>
		{#if result?.testSent}
			<Alert tone={result.viaServer ? 'success' : 'warning'}
				>{result.viaServer
					? i18n.t('admin.outbox.testSent', { email: result.testSent })
					: i18n.t('admin.outbox.testLogged')}</Alert
			>
		{:else if result?.testFailed}
			<Alert tone="error"
				>{i18n.t('admin.outbox.testFailed')}
				<code class="mt-1 block font-mono text-sm break-all">{result.testFailed}</code></Alert
			>
		{/if}
	</section>

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

	<section aria-labelledby="log" class="space-y-4">
		<h2 id="log" class="border-b-2 border-ink pb-1 text-sm font-bold">
			{i18n.t('admin.outbox.logTitle')}
		</h2>
		<p class="text-sm text-ink-muted">{i18n.t('admin.outbox.logLead')}</p>
		<form method="GET" class="flex gap-2" role="search" data-sveltekit-keepfocus>
			<label for="q" class="sr-only">{i18n.t('common.search')}</label>
			<input
				id="q"
				type="search"
				name="q"
				value={data.log.q}
				placeholder={i18n.t('admin.outbox.logSearch')}
				class="h-11 flex-1"
			/>
			<Button type="submit" variant="secondary">{i18n.t('common.search')}</Button>
		</form>
		<p class="text-sm text-ink-muted">
			{i18n.t('admin.outbox.logCount', { count: data.log.total })}
		</p>
		{#if data.log.mails.length}
			<ul class="divide-y divide-line border-y border-line">
				{#each data.log.mails as mail (mail.id)}
					<li class="grid gap-x-4 gap-y-1 py-3 sm:grid-cols-[9.5rem_1fr_auto]">
						<time datetime={mail.at} class="text-sm text-ink-muted tabular-nums"
							>{formatDateTime(new Date(mail.at), i18n.locale, tz)}</time
						>
						<div class="min-w-0">
							<p class="font-semibold">{mail.subject}</p>
							<p class="text-sm break-all text-ink-muted">{mail.to}</p>
							{#if mail.lastError}<p class="font-mono text-xs break-all text-ink-muted">
									{mail.lastError}
								</p>{/if}
						</div>
						<span
							><Badge tone={stateTone[mail.state]}
								>{i18n.t(`admin.outbox.state.${mail.state}`)}</Badge
							></span
						>
					</li>
				{/each}
			</ul>
			{#if data.log.pages > 1}
				<nav class="flex items-center justify-center gap-4 text-sm" aria-label="Pagination">
					{#if data.log.pageNo > 0}<a
							class="font-semibold hover:underline"
							href={logLink(data.log.pageNo - 1)}>← {i18n.t('admin.outbox.newer')}</a
						>{/if}
					<span class="text-ink-muted tabular-nums">{data.log.pageNo + 1} / {data.log.pages}</span>
					{#if data.log.pageNo + 1 < data.log.pages}<a
							class="font-semibold hover:underline"
							href={logLink(data.log.pageNo + 1)}>{i18n.t('admin.outbox.older')} →</a
						>{/if}
				</nav>
			{/if}
		{/if}
	</section>
</div>
