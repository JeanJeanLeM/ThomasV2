/**
 * Service de gestion des communautés (conseiller / animateur).
 * Interface avec les tables communities, community_members, community_invitations, community_join_requests.
 */

import { DirectSupabaseService } from './DirectSupabaseService';
import type {
  Community,
  CommunityMember,
  CommunityInvitation,
  CommunityJoinRequest,
  CommunityRole,
  CommunityMemberProfile,
} from '../types';

export class CommunityService {
  /** Communautés dont l'utilisateur est membre */
  static async getMyCommunities(userId: string): Promise<Community[]> {
    const { data: members, error: membersError } = await DirectSupabaseService.directSelect(
      'community_members',
      'community_id',
      [
        { column: 'user_id', value: userId },
        { column: 'is_active', value: true },
      ]
    );
    if (membersError || !members?.length) {
      return [];
    }
    const ids = (members as { community_id: string }[]).map((m) => m.community_id);
    const communities: Community[] = [];
    for (const id of ids) {
      const c = await this.getCommunityById(id);
      if (c) communities.push(c);
    }
    return communities;
  }

  /** Communautés actives découvrables (pour rejoindre) */
  static async getDiscoverableCommunities(): Promise<Community[]> {
    const { data, error } = await DirectSupabaseService.directSelect(
      'communities',
      '*',
      [{ column: 'status', value: 'active' }]
    );
    if (error) {
      console.error('[CommunityService] getDiscoverableCommunities error:', error);
      return [];
    }
    const communities = (data ?? []) as Community[];
    for (const c of communities) {
      c.member_count = await this.getMemberCount(c.id);
    }
    return communities;
  }

  static async getMemberCount(communityId: string): Promise<number> {
    const { data, error } = await DirectSupabaseService.directSelect(
      'community_members',
      'id',
      [
        { column: 'community_id', value: communityId },
        { column: 'is_active', value: true },
      ]
    );
    if (error) return 0;
    return Array.isArray(data) ? data.length : 0;
  }

  static async getCommunityById(id: string): Promise<Community | null> {
    const { data, error } = await DirectSupabaseService.directSelect(
      'communities',
      '*',
      [{ column: 'id', value: id }],
      true
    );
    if (error || !data) return null;
    const community = data as Community;
    community.member_count = await this.getMemberCount(id);
    return community;
  }

  static async getCommunityMembers(communityId: string): Promise<CommunityMember[]> {
    const { data: rows, error } = await DirectSupabaseService.directSelect(
      'community_members',
      '*',
      [
        { column: 'community_id', value: communityId },
        { column: 'is_active', value: true },
      ]
    );
    if (error || !rows?.length) return [];
    const members = rows as CommunityMember[];
    const userIds = [...new Set(members.map((m) => m.user_id))];
    const profiles = await this.getProfilesByIds(userIds);
    for (const m of members) {
      m.profile = profiles[m.user_id] ?? undefined;
    }
    return members;
  }

  private static async getProfilesByIds(
    userIds: string[]
  ): Promise<Record<string, CommunityMemberProfile>> {
    if (userIds.length === 0) return {};
    const out: Record<string, CommunityMemberProfile> = {};
    for (const id of userIds) {
      const { data } = await DirectSupabaseService.directSelect(
        'profiles',
        'id,first_name,last_name,full_name,avatar_url,email',
        [{ column: 'id', value: id }],
        true
      );
      if (data)
        out[id] = {
          id: (data as any).id,
          first_name: (data as any).first_name ?? '',
          last_name: (data as any).last_name ?? '',
          full_name: (data as any).full_name ?? '',
          avatar_url: (data as any).avatar_url ?? null,
          email: (data as any).email ?? '',
        };
    }
    return out;
  }

  static async createCommunity(
    data: Partial<Community> & { name: string; created_by: string }
  ): Promise<{ id: string } | null> {
    const payload = {
      name: data.name,
      description: data.description ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      postal_code: data.postal_code ?? null,
      region: data.region ?? null,
      department: data.department ?? null,
      country: data.country ?? 'France',
      contact_email: data.contact_email ?? null,
      contact_phone: data.contact_phone ?? null,
      website_url: data.website_url ?? null,
      logo_url: data.logo_url ?? null,
      status: data.status ?? 'active',
      join_policy: data.join_policy ?? 'approval_required',
      requires_approval: data.requires_approval ?? true,
      max_members: data.max_members ?? null,
      join_message: data.join_message ?? null,
      created_by: data.created_by,
    };
    const { data: inserted, error } = await DirectSupabaseService.directInsert(
      'communities',
      payload
    );
    if (error) {
      console.error('[CommunityService] createCommunity error:', error);
      return null;
    }
    const id = (inserted as any)?.id;
    if (!id) return null;
    const addErr = await this.addMember(id, data.created_by, 'admin');
    if (!addErr) {
      console.warn('[CommunityService] createCommunity: failed to add creator as admin');
    }
    return { id };
  }

  static async updateCommunity(id: string, updates: Partial<Community>): Promise<boolean> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const allowed = [
      'name', 'description', 'address', 'city', 'postal_code', 'region', 'department', 'country',
      'contact_email', 'contact_phone', 'website_url', 'logo_url', 'status', 'join_policy',
      'requires_approval', 'max_members', 'join_message',
    ];
    for (const key of allowed) {
      const v = (updates as any)[key];
      if (v !== undefined) payload[key] = v;
    }
    const { error } = await DirectSupabaseService.directUpdate(
      'communities',
      payload,
      [{ column: 'id', value: id }]
    );
    if (error) {
      console.error('[CommunityService] updateCommunity error:', error);
      return false;
    }
    return true;
  }

  static async deleteCommunity(id: string): Promise<boolean> {
    return this.updateCommunity(id, { status: 'archived' });
  }

  static async addMember(
    communityId: string,
    userId: string,
    role: CommunityRole
  ): Promise<boolean> {
    const { error } = await DirectSupabaseService.directInsert('community_members', {
      community_id: communityId,
      user_id: userId,
      role,
      is_active: true,
    });
    if (error) {
      console.error('[CommunityService] addMember error:', error);
      return false;
    }
    return true;
  }

  static async removeMember(memberId: string): Promise<boolean> {
    const { error } = await DirectSupabaseService.directUpdate(
      'community_members',
      { is_active: false, updated_at: new Date().toISOString() },
      [{ column: 'id', value: memberId }]
    );
    if (error) {
      console.error('[CommunityService] removeMember error:', error);
      return false;
    }
    return true;
  }

  static async updateMemberRole(memberId: string, role: CommunityRole): Promise<boolean> {
    const { error } = await DirectSupabaseService.directUpdate(
      'community_members',
      { role, updated_at: new Date().toISOString() },
      [{ column: 'id', value: memberId }]
    );
    if (error) {
      console.error('[CommunityService] updateMemberRole error:', error);
      return false;
    }
    return true;
  }

  static async createInvitation(
    communityId: string,
    email: string,
    role: CommunityRole,
    invitedBy: string,
    message?: string
  ): Promise<boolean> {
    const { error } = await DirectSupabaseService.directInsert('community_invitations', {
      community_id: communityId,
      invited_by: invitedBy,
      email,
      role,
      status: 'pending',
      message: message ?? null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (error) {
      console.error('[CommunityService] createInvitation error:', error);
      return false;
    }
    return true;
  }

  static async acceptInvitation(token: string, acceptedByUserId: string): Promise<boolean> {
    const { data: inv, error: findErr } = await DirectSupabaseService.directSelect(
      'community_invitations',
      '*',
      [
        { column: 'invitation_token', value: token },
        { column: 'status', value: 'pending' },
      ],
      true
    );
    if (findErr || !inv) return false;
    const invitation = inv as CommunityInvitation;
    if (new Date(invitation.expires_at) < new Date()) return false;
    const { error: updateErr } = await DirectSupabaseService.directUpdate(
      'community_invitations',
      { status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: acceptedByUserId },
      [{ column: 'id', value: invitation.id }]
    );
    if (updateErr) return false;
    return this.addMember(invitation.community_id, acceptedByUserId, invitation.role);
  }

  static async createJoinRequest(
    communityId: string,
    userId: string,
    message?: string
  ): Promise<boolean> {
    const { error } = await DirectSupabaseService.directInsert('community_join_requests', {
      community_id: communityId,
      user_id: userId,
      role: 'farmer',
      message: message ?? null,
      status: 'pending',
    });
    if (error) {
      console.error('[CommunityService] createJoinRequest error:', error);
      return false;
    }
    return true;
  }

  static async getPendingJoinRequests(communityId: string): Promise<CommunityJoinRequest[]> {
    const { data, error } = await DirectSupabaseService.directSelect(
      'community_join_requests',
      '*',
      [
        { column: 'community_id', value: communityId },
        { column: 'status', value: 'pending' },
      ]
    );
    if (error) return [];
    return (data ?? []) as CommunityJoinRequest[];
  }

  static async getPendingInvitations(communityId: string): Promise<CommunityInvitation[]> {
    const { data, error } = await DirectSupabaseService.directSelect(
      'community_invitations',
      '*',
      [
        { column: 'community_id', value: communityId },
        { column: 'status', value: 'pending' },
      ]
    );
    if (error) return [];
    return (data ?? []) as CommunityInvitation[];
  }

  static async approveJoinRequest(requestId: string, approvedBy: string): Promise<boolean> {
    const { data: req, error: findErr } = await DirectSupabaseService.directSelect(
      'community_join_requests',
      '*',
      [{ column: 'id', value: requestId }],
      true
    );
    if (findErr || !req) return false;
    const r = req as CommunityJoinRequest;
    if (r.status !== 'pending') return false;
    const { error: updateErr } = await DirectSupabaseService.directUpdate(
      'community_join_requests',
      { status: 'approved', approved_at: new Date().toISOString(), approved_by: approvedBy },
      [{ column: 'id', value: requestId }]
    );
    if (updateErr) return false;
    return this.addMember(r.community_id, r.user_id, r.role);
  }

  static async rejectJoinRequest(requestId: string, rejectedBy: string, reason?: string): Promise<boolean> {
    const { error } = await DirectSupabaseService.directUpdate(
      'community_join_requests',
      {
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_by: rejectedBy,
        rejection_reason: reason ?? null,
      },
      [{ column: 'id', value: requestId }]
    );
    if (error) return false;
    return true;
  }

  /** Vérifie si l'utilisateur est membre (actif) de la communauté */
  static async getMembership(
    communityId: string,
    userId: string
  ): Promise<CommunityMember | null> {
    const { data, error } = await DirectSupabaseService.directSelect(
      'community_members',
      '*',
      [
        { column: 'community_id', value: communityId },
        { column: 'user_id', value: userId },
        { column: 'is_active', value: true },
      ],
      true
    );
    if (error || !data) return null;
    return data as CommunityMember;
  }

  /** primary_role du profil (farmer | advisor | admin) */
  static async getPrimaryRole(userId: string): Promise<string> {
    const { data } = await DirectSupabaseService.directSelect(
      'profiles',
      'primary_role',
      [{ column: 'id', value: userId }],
      true
    );
    return (data as any)?.primary_role ?? 'farmer';
  }
}
