import type { FarmInvitation, FarmInvitationFarm } from '../types';

/**
 * Maps raw DB farm_invitations row (snake_case) to FarmInvitation (camelCase).
 * Preserves optional `farms` join when present.
 */
export function mapFarmInvitationRow(row: {
  id: number;
  farm_id: number;
  invited_by: string;
  email: string;
  role: string;
  message?: string | null;
  invitation_token?: string;
  expires_at: string;
  status: string;
  accepted_at?: string | null;
  accepted_by?: string | null;
  created_at: string;
  updated_at: string;
  farms?: FarmInvitationFarm | null;
}): FarmInvitation {
  const mapped: FarmInvitation = {
    id: row.id,
    farmId: row.farm_id,
    invitedBy: row.invited_by,
    email: row.email,
    role: row.role as FarmInvitation['role'],
    message: row.message ?? undefined,
    invitationToken: row.invitation_token ?? '',
    expiresAt: row.expires_at,
    status: row.status as FarmInvitation['status'],
    acceptedAt: row.accepted_at ?? undefined,
    acceptedBy: row.accepted_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.farms) {
    mapped.farms = row.farms;
  }
  return mapped;
}
