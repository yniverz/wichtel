import { error } from '@sveltejs/kit';
import type { z } from 'zod';
import type { AdminContext } from './guards.ts';
import type { goodieSchema } from './schemas.ts';
import type { GoodieInput } from './services/goodies.ts';

export function requireGoodieManager(ctx: AdminContext) {
	if (!ctx.authz.can('goodie.manage')) error(403, 'error.forbidden');
}

export function goodieInputFromForm(
	data: z.output<typeof goodieSchema>,
	validAreaIds: Set<string>
): GoodieInput {
	const { 'requiredAreaIds[]': requiredAreaIds, ...rest } = data;
	return { ...rest, requiredAreaIds: requiredAreaIds.filter((id) => validAreaIds.has(id)) };
}

export const emptyGoodie = {
	nameDe: '',
	nameEn: '',
	descriptionDe: '',
	descriptionEn: '',
	price: 1,
	maxPerPerson: 1,
	selfServiceLimit: null as number | null,
	stock: null as number | null,
	variants: [] as string[],
	requiredAreaIds: [] as string[],
	mandatory: false,
	mandatoryPriority: 0,
	refundable: false,
	advance: false,
	active: true,
	sortOrder: 0,
	pickupPlaceId: null as string | null,
	pickupInfo: ''
};
