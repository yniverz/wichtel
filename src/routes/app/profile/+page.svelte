<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import ConfirmForm from '#lib/components/ConfirmForm.svelte';
	import Field from '#lib/components/Field.svelte';
	import FieldInputs from '#lib/components/FieldInputs.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDate, LOCALES } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const profileForm = pendingForm({ reset: false });
	const passwordForm = pendingForm();
	const fieldsForm = pendingForm({ reset: false });
	let copied = $state(false);
	let mcpCopied = $state(false);

	type Result = {
		action?: string;
		error?: string;
		success?: string;
		errors?: Record<string, string>;
		values?: Record<string, string>;
	};
	const result = $derived(form as Result | null);
	const profileResult = $derived(result?.action === 'profile' ? result : null);
	const passwordResult = $derived(result?.action === 'password' ? result : null);
	const fieldsResult = $derived(result?.action === 'fields' ? result : null);
	const values = $derived({ ...data.profile, ...(profileResult?.values ?? {}) });
</script>

<svelte:head
	><title>{i18n.t('profile.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<div class="mx-auto max-w-2xl space-y-6">
	<div class="border-b border-ink pb-4">
		<h1 class="font-display text-5xl uppercase">{i18n.t('profile.title')}</h1>
		<p class="mt-2 text-ink-muted">
			{i18n.t('profile.emailInfo', { email: page.data.user?.email ?? '' })}
		</p>
	</div>

	<Card title={i18n.t('profile.personal')}>
		<form method="POST" action="?/profile" class="space-y-4" use:enhance={profileForm.submit}>
			<FormMessage error={profileResult?.error} success={profileResult?.success} />
			<div class="grid gap-4 sm:grid-cols-2">
				<Field
					label={i18n.t('field.firstName')}
					name="firstName"
					autocomplete="given-name"
					value={values.firstName}
					error={profileResult?.errors?.firstName}
				/>
				<Field
					label={i18n.t('field.lastName')}
					name="lastName"
					autocomplete="family-name"
					value={values.lastName}
					error={profileResult?.errors?.lastName}
				/>
			</div>
			<Field
				label={i18n.t('field.phone')}
				name="phone"
				type="tel"
				autocomplete="tel"
				hint={i18n.t('field.phoneHint')}
				value={values.phone}
				error={profileResult?.errors?.phone}
			/>
			<div class="space-y-1.5">
				<label for="locale" class="text-sm font-medium">{i18n.t('field.locale')}</label>
				<select id="locale" name="locale" class="block h-11 w-full" value={values.locale}>
					{#each LOCALES as l (l)}<option value={l}>{i18n.t(`locale.${l}`)}</option>{/each}
				</select>
			</div>
			<Button type="submit" loading={profileForm.pending}>{i18n.t('common.save')}</Button>
		</form>
	</Card>

	{#if data.fields.length}
		<Card title={i18n.t('profile.more')} description={i18n.t('profile.moreHint')}>
			<form method="POST" action="?/fields" class="space-y-4" use:enhance={fieldsForm.submit}>
				<FormMessage error={fieldsResult?.error} success={fieldsResult?.success} />
				<FieldInputs
					fields={data.fields}
					values={data.fieldValues}
					errors={fieldsResult?.errors ?? {}}
				/>
				<Button type="submit" loading={fieldsForm.pending}>{i18n.t('common.save')}</Button>
			</form>
		</Card>
	{/if}

	<Card title={i18n.t('profile.password')}>
		<form method="POST" action="?/password" class="space-y-4" use:enhance={passwordForm.submit}>
			<FormMessage error={passwordResult?.error} success={passwordResult?.success} />
			<Field
				label={i18n.t('field.currentPassword')}
				name="currentPassword"
				type="password"
				autocomplete="current-password"
				error={passwordResult?.errors?.currentPassword}
			/>
			<Field
				label={i18n.t('field.newPassword')}
				name="newPassword"
				type="password"
				autocomplete="new-password"
				minlength={10}
				hint={i18n.t('auth.register.passwordHint')}
				error={passwordResult?.errors?.newPassword}
			/>
			<Button type="submit" variant="secondary" loading={passwordForm.pending}
				>{i18n.t('profile.passwordSubmit')}</Button
			>
		</form>
	</Card>

	<a
		href="/app/qualifications"
		class="flex items-center justify-between rounded-lg border border-line bg-surface-raised p-5 font-semibold hover:border-ink"
	>
		{i18n.t('profile.qualifications')} <span aria-hidden="true">→</span>
	</a>
	<a
		href="/app/group"
		class="flex items-center justify-between rounded-lg border border-line bg-surface-raised p-5 font-semibold hover:border-ink"
	>
		{i18n.t('group.title')} <span aria-hidden="true">→</span>
	</a>

	<Card title={i18n.t('calendar.title')} description={i18n.t('calendar.lead')}>
		<div class="flex flex-wrap gap-2">
			<Button href={data.calendarUrl.replace(/^https?:/, 'webcal:')}
				>{i18n.t('calendar.subscribe')}</Button
			>
			<Button
				variant="secondary"
				onclick={async () => {
					await navigator.clipboard.writeText(data.calendarUrl);
					copied = true;
					setTimeout(() => (copied = false), 2000);
				}}>{copied ? i18n.t('calendar.copied') : i18n.t('calendar.copy')}</Button
			>
			<ConfirmForm
				action="?/rotateCalendar"
				variant="ghost"
				message={i18n.t('calendar.rotateConfirm')}
				confirmLabel={i18n.t('calendar.rotate')}
			>
				{i18n.t('calendar.rotate')}
			</ConfirmForm>
		</div>
	</Card>

	{#if data.mcp}
		<Card title={i18n.t('mcp.profile.title')} description={i18n.t('mcp.profile.lead')}>
			<div class="space-y-5">
				<div>
					<p class="text-sm font-semibold">{i18n.t('mcp.profile.url')}</p>
					<div class="mt-1 flex flex-wrap items-center gap-2">
						<code class="rounded-sm bg-ink/5 px-2 py-1 text-sm break-all">{data.mcp.url}</code>
						<Button
							variant="secondary"
							size="sm"
							onclick={async () => {
								await navigator.clipboard.writeText(data.mcp?.url ?? '');
								mcpCopied = true;
								setTimeout(() => (mcpCopied = false), 2000);
							}}>{mcpCopied ? i18n.t('calendar.copied') : i18n.t('calendar.copy')}</Button
						>
					</div>
				</div>
				<ol class="list-decimal space-y-1 pl-5 text-sm">
					<li>{i18n.t('mcp.profile.step1')}</li>
					<li>{i18n.t('mcp.profile.step2')}</li>
					<li>{i18n.t('mcp.profile.step3')}</li>
				</ol>
				<p class="text-sm text-ink-muted">
					{i18n.t('mcp.profile.code')}
					<code class="break-all">claude mcp add --transport http wichtel {data.mcp.url}</code>
				</p>
				<div>
					<p class="border-b border-line pb-1 text-sm font-bold">
						{i18n.t('mcp.profile.connections')}
					</p>
					{#if data.mcp.connections.length === 0}
						<p class="py-2 text-sm text-ink-muted">{i18n.t('mcp.profile.none')}</p>
					{:else}
						<ul class="divide-y divide-line">
							{#each data.mcp.connections as c (c.id)}
								<li class="flex flex-wrap items-center justify-between gap-3 py-2.5">
									<div class="min-w-0 text-sm">
										<p class="font-semibold">
											{c.clientName}
											<span class="font-normal text-ink-muted"
												>· {c.scope === 'write'
													? i18n.t('mcp.scope.write')
													: i18n.t('mcp.scope.read')}</span
											>
										</p>
										<p class="text-ink-muted">
											{i18n.t('mcp.profile.validUntil', {
												date: formatDate(new Date(c.expiresAt), i18n.locale)
											})}{#if c.lastUsedAt}
												· {i18n.t('mcp.profile.lastUsed', {
													date: formatDate(new Date(c.lastUsedAt), i18n.locale)
												})}{/if}
										</p>
									</div>
									<ConfirmForm
										action="?/disconnect"
										hidden={{ id: c.id }}
										variant="secondary"
										message={i18n.t('mcp.profile.disconnectConfirm', { name: c.clientName })}
										confirmLabel={i18n.t('mcp.profile.disconnect')}
									>
										{i18n.t('mcp.profile.disconnect')}
									</ConfirmForm>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
		</Card>
	{/if}

	<form method="POST" action="/logout" class="md:hidden">
		<Button type="submit" variant="secondary" block>{i18n.t('nav.logout')}</Button>
	</form>
</div>
