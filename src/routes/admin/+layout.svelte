<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import BrandMark from '#lib/components/BrandMark.svelte';
	import Button from '#lib/components/Button.svelte';
	import LocaleSwitch from '#lib/components/LocaleSwitch.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { MessageKey } from '#lib/i18n/index.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const i18n = getI18n();
	let menuOpen = $state(false);
	afterNavigate(() => (menuOpen = false));

	const nav = $derived(
		(
			[
				{ href: '/admin', label: 'admin.nav.overview', show: true },
				{ href: '/admin/desk', label: 'admin.nav.desk', show: data.access.desk },
				{ href: '/admin/shifts', label: 'admin.nav.shifts', show: data.access.shifts },
				{ href: '/admin/waves', label: 'admin.nav.waves', show: data.access.waves },
				{ href: '/admin/goodies', label: 'admin.nav.goodies', show: data.access.goodies },
				{ href: '/admin/areas', label: 'admin.nav.areas', show: data.access.areas },
				{ href: '/admin/people', label: 'admin.nav.people', show: data.access.people },
				{
					href: '/admin/qualifications',
					label: 'admin.nav.qualifications',
					show: data.access.qualifications
				},
				{ href: '/admin/roles', label: 'admin.nav.roles', show: data.access.isAdmin },
				{ href: '/admin/fields', label: 'admin.nav.fields', show: data.access.isAdmin },
				{ href: '/admin/editions', label: 'admin.nav.editions', show: data.access.isAdmin },
				{ href: '/admin/settings', label: 'admin.nav.settings', show: data.access.isAdmin },
				{ href: '/admin/audit', label: 'admin.nav.audit', show: data.access.audit }
			] satisfies { href: string; label: MessageKey; show: boolean }[]
		).filter((n) => n.show)
	);
	const isActive = (href: string) =>
		href === '/admin' ? page.url.pathname === '/admin' : page.url.pathname.startsWith(href);
	const next = $derived(page.url.pathname);
</script>

{#snippet editionSwitch()}
	{#if data.editions.length > 0}
		<form method="POST" action="/admin/edition" class="space-y-1">
			<input type="hidden" name="next" value={next} />
			<label for="edition-switch" class="block text-xs font-medium text-ink-muted"
				>{i18n.t('admin.edition')}</label
			>
			<select
				id="edition-switch"
				name="edition"
				class="block h-10 w-full text-sm"
				value={data.edition?.id}
				onchange={(e) => e.currentTarget.form?.requestSubmit()}
			>
				{#each data.editions as edition (edition.id)}
					<option value={edition.id}>
						{edition.name}{edition.isCurrent ? ` (${i18n.t('admin.edition.current')})` : ''}
					</option>
				{/each}
			</select>
			<noscript><Button type="submit" size="sm" variant="secondary">OK</Button></noscript>
		</form>
	{/if}
{/snippet}

{#snippet navList()}
	<ul class="space-y-0.5">
		{#each nav as item (item.href)}
			<li>
				<a
					href={item.href}
					class="flex items-center rounded-md px-3 py-2 text-sm font-semibold transition-colors {isActive(
						item.href
					)
						? 'bg-ink text-surface'
						: 'text-ink-muted hover:bg-ink/6 hover:text-ink'}"
					aria-current={isActive(item.href) ? 'page' : undefined}>{i18n.t(item.label)}</a
				>
			</li>
		{/each}
	</ul>
{/snippet}

<div class="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
	<!-- Desktop sidebar -->
	<aside
		class="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-ink bg-surface-raised p-4 lg:flex"
	>
		<BrandMark href="/admin" />
		{@render editionSwitch()}
		<nav aria-label={i18n.t('admin.title')} class="flex-1 overflow-y-auto">{@render navList()}</nav>
		<div class="space-y-3 border-t border-line pt-4">
			<a href="/app" class="block text-sm text-ink-muted hover:text-ink"
				>← {i18n.t('admin.nav.toApp')}</a
			>
			<div class="flex items-center justify-between">
				<LocaleSwitch />
				<form method="POST" action="/logout">
					<Button type="submit" variant="ghost" size="sm">{i18n.t('nav.logout')}</Button>
				</form>
			</div>
		</div>
	</aside>

	<!-- Mobile top bar -->
	<header class="sticky top-0 z-30 border-b border-ink bg-surface lg:hidden">
		<div class="flex h-14 items-center justify-between gap-3 px-4">
			<BrandMark href="/admin" />
			<button
				class="rounded-md border border-ink/25 px-3 py-1.5 text-sm font-semibold"
				aria-expanded={menuOpen}
				aria-controls="admin-menu"
				onclick={() => (menuOpen = !menuOpen)}>{i18n.t('common.menu')}</button
			>
		</div>
		{#if menuOpen}
			<div id="admin-menu" class="space-y-4 border-t border-line px-4 py-4">
				{@render editionSwitch()}
				<nav aria-label={i18n.t('admin.title')}>{@render navList()}</nav>
				<div class="flex items-center justify-between border-t border-line pt-3">
					<a href="/app" class="text-sm text-ink-muted">← {i18n.t('admin.nav.toApp')}</a>
					<LocaleSwitch />
				</div>
			</div>
		{/if}
	</header>

	<main class="min-w-0 px-4 py-6 lg:px-10 lg:py-10">
		<div class="mx-auto max-w-5xl">
			{#if !data.edition && page.url.pathname !== '/admin/editions' && page.url.pathname !== '/admin/settings'}
				<div class="mb-6 rounded-md border border-accent bg-accent/20 px-4 py-3 text-sm">
					{i18n.t('admin.noEdition')}
					{#if data.access.isAdmin}<a href="/admin/editions" class="font-semibold underline"
							>{i18n.t('admin.noEditionLink')}</a
						>{/if}
				</div>
			{/if}
			{@render children()}
		</div>
	</main>
</div>
