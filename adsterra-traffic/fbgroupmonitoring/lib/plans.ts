// Plan limits for group tracking
export const PLAN_LIMITS: Record<string, number> = {
  none: 0,
  basic: 1,
  pro: 5,
  scale: 15,
}

export const BASIC_PLAN_ID = process.env.POLAR_BASIC_PLAN_ID || 'ff8a9b62-b8f7-4183-b76c-6a4aad2f2ed7'
export const PRO_PLAN_ID = process.env.POLAR_PRO_PLAN_ID || '1d3d8ccd-aa6c-4b3b-8e06-97bd859f5e10'
export const SCALE_PLAN_ID = process.env.POLAR_SCALE_PLAN_ID || '0e40861a-2b68-4eb0-8c6b-ac22660c84c7'

/**
 * Given a polar plan_id, return the tier name: 'none' | 'basic' | 'pro' | 'scale'
 */
export function getTierFromPlanId(planId: string | null | undefined): 'none' | 'basic' | 'pro' | 'scale' {
  if (planId === BASIC_PLAN_ID) return 'basic'
  if (planId === PRO_PLAN_ID) return 'pro'
  if (planId === SCALE_PLAN_ID) return 'scale'
  return 'none'
}

/**
 * Given a polar plan_id, return how many groups the user can track.
 */
export function getGroupLimit(planId: string | null | undefined): number {
  return PLAN_LIMITS[getTierFromPlanId(planId)] || 0
}
