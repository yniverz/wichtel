<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import ConfirmForm from '#lib/components/ConfirmForm.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import {
		formatDate,
		formatDayShort,
		formatTime,
		localized,
		type MessageKey
	} from '#lib/i18n/index.ts';
	import { utcToZoned } from '#lib/domain/time.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const assignForm = pendingForm();
	type Result = { action?: string; error?: string; success?: string };
	const result = $derived(form as Result | null);
	const name = $derived(`${data.person.firstName} ${data.person.lastName}`);
	const edition = $derived(page.data.edition);
</script>

<svelte:head><title>{name} · {page.data.settings.festivalName}</title></svelte:head>

<PageHeader title={name} back={{ href: '/admin/people', label: i18n.t('admin.people.title') }} />

<div class="-mt-3 mb-6 flex flex-wrap gap-2">
	{#if data.person.isAdmin}<Badge tone="brand">{i18n.t('admin.people.adminBadge')}</Badge>{/if}
	{#if !data.person.emailVerified}<Badge tone="warning">{i18n.t('admin.people.unverified')}</Badge
		>{/if}
	<span class="text-sm text-ink-muted"
		>{i18n.t('admin.people.registered', {
			date: formatDate(new Date(data.person.createdAt), i18n.locale)
		})}</span
	>
</div>

<div class="grid gap-6 lg:grid-cols-3">
	<div class="space-y-6 lg:col-span-2">
		{#if data.shifts.length}
			<Card title={i18n.t('admin.people.shifts')}>
				<ul class="divide-y divide-line">
					{#each data.shifts as shift (shift.id)}
						<li>
							<a
								href="/admin/shifts/{shift.id}"
								class="grid grid-cols-[8rem_1fr_auto] items-baseline gap-3 py-2 text-sm hover:underline"
							>
								<span class="tabular-nums"
									>{formatDayShort(
										utcToZoned(new Date(shift.startsAt), data.timezone).date,
										i18n.locale
									)}
									{formatTime(shift.startsAt, i18n.locale, data.timezone)}</span
								>
								<span class="font-semibold">{localized(shift, 'title', i18n.locale)}</span>
								<span class="text-ink-muted">
									{shift.status === 'booked'
										? shift.attendance === 'attended'
											? i18n.t('admin.shifts.attended')
											: shift.attendance === 'no_show'
												? i18n.t('admin.shifts.noShow')
												: ''
										: i18n.t(
												`shifts.status.${shift.status as 'requested' | 'held' | 'waitlisted'}`
											)}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</Card>
		{/if}
		{#if edition}
			<Card title={i18n.t('admin.people.rolesIn', { edition: edition.name })}>
				{#if result?.action === 'remove' || result?.action === 'assign'}
					<div class="mb-4"><FormMessage error={result.error} success={result.success} /></div>
				{/if}
				{#if data.assignments.length === 0}
					<p class="text-sm text-ink-muted">{i18n.t('admin.people.noRoles')}</p>
				{:else}
					<ul class="divide-y divide-line">
						{#each data.assignments as a (a.id)}
							<li class="flex flex-wrap items-center justify-between gap-2 py-3">
								<div>
									<p class="font-medium">{localized(a.role, 'name', i18n.locale)}</p>
									<p class="text-sm text-ink-muted">
										{a.areaId
											? localized(
													{ nameDe: a.areaNameDe, nameEn: a.areaNameEn },
													'name',
													i18n.locale
												)
											: i18n.t('admin.people.scopeAll')}
									</p>
								</div>
								{#if a.removable}
									<ConfirmForm
										action="?/remove"
										hidden={{ id: a.id }}
										variant="ghost"
										message={i18n.t('common.confirm')}
										confirmLabel={i18n.t('admin.people.remove')}
									>
										{i18n.t('admin.people.remove')}
									</ConfirmForm>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}

				{#if data.assignableRoles.length > 0 && data.scopes.length > 0}
					<form
						method="POST"
						action="?/assign"
						class="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
						use:enhance={assignForm.submit}
					>
						<div class="space-y-1.5">
							<label for="roleId" class="text-sm font-medium">{i18n.t('admin.people.role')}</label>
							<select id="roleId" name="roleId" class="block h-11 w-full" required>
								{#each data.assignableRoles as role (role.id)}
									<option value={role.id}>{localized(role, 'name', i18n.locale)}</option>
								{/each}
							</select>
						</div>
						<div class="space-y-1.5">
							<label for="areaId" class="text-sm font-medium">{i18n.t('admin.people.scope')}</label>
							<select id="areaId" name="areaId" class="block h-11 w-full">
								{#each data.scopes as scope (scope.id)}
									<option value={scope.id}>
										{scope.label === null
											? i18n.t('admin.people.scopeAll')
											: `${'  '.repeat(scope.depth)}${scope.depth ? '└ ' : ''}${scope.label}`}
									</option>
								{/each}
							</select>
						</div>
						<Button type="submit" loading={assignForm.pending}
							>{i18n.t('admin.people.assign')}</Button
						>
					</form>
				{/if}
			</Card>
		{/if}
	</div>

	<div class="space-y-6">
		{#if page.data.access.desk}
			<a
				href="/admin/desk/{data.person.id}"
				class="block rounded-lg border border-line bg-surface-raised p-5 hover:border-ink"
			>
				<span class="text-sm text-ink-muted">{i18n.t('admin.people.points')}</span>
				<span class="mt-1 block font-semibold">{i18n.t('admin.people.openDesk')} →</span>
			</a>
		{/if}
		{#if data.person.email}
			<Card title={i18n.t('admin.people.contact')}>
				<dl class="space-y-2 text-sm">
					<div>
						<dt class="text-ink-muted">{i18n.t('field.email')}</dt>
						<dd>
							<a class="text-brand-text hover:underline" href="mailto:{data.person.email}"
								>{data.person.email}</a
							>
						</dd>
					</div>
					{#if data.person.phone}<div>
							<dt class="text-ink-muted">{i18n.t('field.phone')}</dt>
							<dd>
								<a class="text-brand-text hover:underline" href="tel:{data.person.phone}"
									>{data.person.phone}</a
								>
							</dd>
						</div>{/if}
				</dl>
			</Card>
		{/if}

		{#if data.details.length}
			<Card title={i18n.t('admin.people.fields')}>
				<dl class="space-y-2 text-sm">
					{#each data.details as d (d.id)}
						<div>
							<dt class="text-ink-muted">{localized(d, 'label', i18n.locale)}</dt>
							<dd>{d.value}</dd>
						</div>
					{/each}
				</dl>
			</Card>
		{/if}
		{#if data.qualifications}
			<Card title={i18n.t('admin.quals.ofPerson')}>
				{#if result?.action === 'qualification'}<div class="mb-3">
						<FormMessage error={result.error} success={result.success} />
					</div>{/if}
				{#if data.qualifications.held.length === 0}
					<p class="text-sm text-ink-muted">{i18n.t('admin.quals.none')}</p>
				{:else}
					<ul class="divide-y divide-line text-sm">
						{#each data.qualifications.held as q (q.id)}
							<li class="flex items-center justify-between gap-2 py-2">
								<span>
									{localized(q, 'name', i18n.locale)}
									<span class="text-ink-muted"
										>· {i18n.t(`quals.status.${q.status}` as MessageKey)}{#if q.expiresAt}
											· {formatDate(new Date(q.expiresAt), i18n.locale)}{/if}</span
									>
								</span>
								{#if q.status === 'approved'}
									<ConfirmForm
										action="?/revokeQualification"
										hidden={{ id: q.id }}
										variant="ghost"
										message={i18n.t('admin.quals.revokeConfirm')}
										confirmLabel={i18n.t('admin.quals.revoke')}
									>
										{i18n.t('admin.quals.revoke')}
									</ConfirmForm>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
				{#if data.qualifications.options.length}
					<form method="POST" action="?/grantQualification" use:enhance class="mt-4 flex gap-2">
						<label class="sr-only" for="grant-q">{i18n.t('admin.quals.grant')}</label>
						<select id="grant-q" name="qualificationId" class="h-9 min-w-0 flex-1 py-0 text-sm">
							{#each data.qualifications.options as o (o.id)}<option value={o.id}
									>{localized(o, 'name', i18n.locale)}</option
								>{/each}
						</select>
						<Button type="submit" size="sm" variant="secondary"
							>{i18n.t('admin.quals.grantSubmit')}</Button
						>
					</form>
				{/if}
			</Card>
		{/if}

		{#if page.data.access.isAdmin}
			<Card
				title={i18n.t('admin.people.instanceAdmin')}
				description={i18n.t('admin.people.instanceAdminHint')}
			>
				{#if result?.action === 'admin'}<div class="mb-3">
						<FormMessage error={result.error} success={result.success} />
					</div>{/if}
				<ConfirmForm
					action="?/admin"
					hidden={{ isAdmin: data.person.isAdmin ? '' : 'on' }}
					variant={data.person.isAdmin ? 'danger' : 'secondary'}
					message={i18n.t('common.confirm')}
					confirmLabel={data.person.isAdmin
						? i18n.t('admin.people.revokeAdmin')
						: i18n.t('admin.people.grantAdmin')}
				>
					{data.person.isAdmin
						? i18n.t('admin.people.revokeAdmin')
						: i18n.t('admin.people.grantAdmin')}
				</ConfirmForm>
			</Card>
		{/if}
	</div>
</div>
