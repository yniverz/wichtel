<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import BrandMark from '#lib/components/BrandMark.svelte';
	import Button from '#lib/components/Button.svelte';
	import Footer from '#lib/components/Footer.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import LocaleSwitch from '#lib/components/LocaleSwitch.svelte';
	import NavIcon from '#lib/components/NavIcon.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import type { MessageKey } from '#lib/i18n/index.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const i18n = getI18n();

	type NavItem = {
		href: string;
		label: MessageKey;
		icon: 'home' | 'shifts' | 'goodies' | 'profile' | 'admin';
		soon?: boolean;
	};
	const nav = $derived<NavItem[]>([
		{ href: '/app', label: 'nav.home', icon: 'home' },
		{ href: '/app/shifts', label: 'nav.shifts', icon: 'shifts', soon: true },
		{ href: '/app/goodies', label: 'nav.goodies', icon: 'goodies', soon: true },
		{ href: '/app/profile', label: 'nav.profile', icon: 'profile' },
		...(data.canAdmin ? [{ href: '/admin', label: 'nav.admin', icon: 'admin' } as NavItem] : [])
	]);
	const isActive = (href: string) =>
		href === '/app' ? page.url.pathname === '/app' : page.url.pathname.startsWith(href);

	let resendResult: { success?: string; error?: string } | undefined = $state();
</script>

<div class="flex min-h-dvh flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
	<a
		href="#main"
		class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface-raised focus:px-3 focus:py-2"
		>{i18n.t('common.skipToContent')}</a
	>
	<header class="sticky top-0 z-30 border-b border-ink bg-surface">
		<div class="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
			<BrandMark href="/app" />
			<nav class="hidden items-center gap-1 md:flex" aria-label={i18n.t('common.menu')}>
				{#each nav as item (item.href)}
					{#if item.soon}
						<span
							class="cursor-default px-3 py-2 text-sm text-ink-muted/50"
							title={i18n.t('common.comingSoon')}>{i18n.t(item.label)}</span
						>
					{:else}
						<a
							href={item.href}
							class="px-3 py-2 text-sm font-semibold transition-colors {isActive(item.href)
								? 'text-ink underline decoration-brand decoration-2 underline-offset-[6px]'
								: 'text-ink-muted hover:text-ink'}"
							aria-current={isActive(item.href) ? 'page' : undefined}>{i18n.t(item.label)}</a
						>
					{/if}
				{/each}
			</nav>
			<div class="flex items-center gap-2">
				<LocaleSwitch />
				<form method="POST" action="/logout" class="hidden md:block">
					<Button type="submit" variant="ghost" size="sm">{i18n.t('nav.logout')}</Button>
				</form>
			</div>
		</div>
	</header>

	<main id="main" class="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
		{#if page.data.user && !page.data.user.emailVerified}
			<div class="mx-auto max-w-lg space-y-4 py-6">
				<h1 class="font-display text-4xl">{i18n.t('auth.verifyPending.title')}</h1>
				<p class="text-ink-muted">
					{i18n.t('auth.verifyPending.text', { email: page.data.user.email })}
				</p>
				<p class="text-sm text-ink-muted">{i18n.t('auth.checkMail.spam')}</p>
				<FormMessage error={resendResult?.error} success={resendResult?.success} />
				<form
					method="POST"
					action="/verify-email?/resend"
					use:enhance={() =>
						async ({ result }) => {
							if (result.type === 'success') resendResult = result.data as typeof resendResult;
							else if (result.type === 'failure') resendResult = result.data as typeof resendResult;
						}}
				>
					<Button type="submit" variant="secondary" block
						>{i18n.t('auth.verifyPending.resend')}</Button
					>
				</form>
			</div>
		{:else}
			{@render children()}
		{/if}
	</main>

	<Footer />

	<nav
		class="fixed inset-x-0 bottom-0 z-30 border-t border-ink bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
		aria-label={i18n.t('common.menu')}
	>
		<ul class="mx-auto flex max-w-md justify-around">
			{#each nav as item (item.href)}
				<li class="flex-1">
					{#if item.soon}
						<span
							class="flex h-16 flex-col items-center justify-center gap-1 text-[11px] text-ink-muted/50"
							aria-disabled="true"
						>
							<NavIcon name={item.icon} />
							{i18n.t(item.label)}
						</span>
					{:else}
						<a
							href={item.href}
							class="relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold {isActive(
								item.href
							)
								? 'text-ink before:absolute before:inset-x-4 before:top-0 before:h-[3px] before:bg-brand'
								: 'text-ink-muted'}"
							aria-current={isActive(item.href) ? 'page' : undefined}
						>
							<NavIcon name={item.icon} />
							{i18n.t(item.label)}
						</a>
					{/if}
				</li>
			{/each}
		</ul>
	</nav>
</div>
