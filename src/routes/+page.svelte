<script lang="ts">
	import BrandMark from '#lib/components/BrandMark.svelte';
	import Button from '#lib/components/Button.svelte';
	import Footer from '#lib/components/Footer.svelte';
	import LocaleSwitch from '#lib/components/LocaleSwitch.svelte';
	import { assetUrl } from '#lib/assets.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDateRange, localized } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = getI18n();
	const tagline = $derived(localized(data.settings, 'tagline', i18n.locale));

	const steps = [
		{ n: '01', title: 'landing.step1.title', text: 'landing.step1.text' },
		{ n: '02', title: 'landing.step2.title', text: 'landing.step2.text' },
		{ n: '03', title: 'landing.step3.title', text: 'landing.step3.text' }
	] as const;
</script>

<div class="flex min-h-dvh flex-col">
	<header
		class="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6"
	>
		<BrandMark />
		<div class="flex items-center gap-4">
			{#if !data.user}
				<a href="/login" class="hidden text-sm font-semibold hover:underline sm:inline"
					>{i18n.t('nav.login')}</a
				>
			{/if}
			<LocaleSwitch />
		</div>
	</header>

	{#if data.settings.backgroundAssetId}
		<div class="mx-auto w-full max-w-6xl px-4 sm:px-6">
			<img
				src={assetUrl(data.settings.backgroundAssetId)}
				alt=""
				class="h-[28vh] w-full rounded-lg object-cover sm:h-[36vh]"
			/>
		</div>
	{/if}

	<main
		class="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16 lg:py-16"
	>
		<section>
			<p class="text-sm font-bold text-brand-text">{i18n.t('landing.kicker')}</p>
			<h1 class="font-display mt-3 text-[clamp(3.5rem,13vw,8.5rem)] break-words uppercase">
				{data.settings.festivalName}
			</h1>
			{#if data.edition}
				<p class="font-display-wide mt-5 text-xl tabular-nums sm:text-2xl">
					{formatDateRange(data.edition.startsOn, data.edition.endsOn, i18n.locale)}
				</p>
			{/if}
			{#if tagline}<p class="mt-2 text-lg font-semibold">{tagline}</p>{/if}
			<p class="mt-6 max-w-xl text-lg text-ink-muted">{i18n.t('landing.lead')}</p>

			<div class="mt-8 flex flex-col gap-3 sm:flex-row">
				{#if data.user}
					<Button href="/app" size="lg">{i18n.t('landing.toApp')}</Button>
				{:else}
					{#if data.settings.registrationOpen}
						<Button href="/register" size="lg">{i18n.t('landing.register')}</Button>
					{/if}
					<Button href="/login" size="lg" variant="secondary">{i18n.t('landing.login')}</Button>
				{/if}
			</div>
		</section>

		<section aria-labelledby="how" class="self-end">
			<h2 id="how" class="border-b-2 border-ink pb-2 text-sm font-bold">{i18n.t('landing.how')}</h2>
			<ol>
				{#each steps as step (step.n)}
					<li class="grid grid-cols-[3.25rem_1fr] gap-3 border-b border-line py-5">
						<span class="font-display text-4xl text-brand-text tabular-nums">{step.n}</span>
						<div>
							<h3 class="font-bold">{i18n.t(step.title)}</h3>
							<p class="mt-1 text-sm text-ink-muted">{i18n.t(step.text)}</p>
						</div>
					</li>
				{/each}
			</ol>
		</section>
	</main>

	<Footer />
</div>
