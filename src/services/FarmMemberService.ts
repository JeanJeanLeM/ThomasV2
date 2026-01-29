import { supabase } from '../utils/supabase';
import { DirectSupabaseService } from './DirectSupabaseService';
import { mapFarmInvitationRow } from '../utils/farmInvitationMapper';
import type { 
  FarmMember, 
  FarmInvitation, 
  InviteMemberData, 
  UserRole, 
  MemberPermissions,
  InvitationStatus 
} from '../types';

export class FarmMemberService {
  // Récupérer tous les membres d'une ferme
  async getFarmMembers(farmId: number): Promise<FarmMember[]> {
    try {
      // Récupérer les membres via API directe
      const { data: membersData, error: membersError } = await DirectSupabaseService.directSelect(
        'farm_members',
        '*',
        [
          { column: 'farm_id', value: farmId },
          { column: 'is_active', value: true }
        ]
      );

      if (membersError) throw new Error(membersError.message || 'Erreur récupération membres');
      if (!membersData || !Array.isArray(membersData) || membersData.length === 0) return [];

      // Récupérer les profils des utilisateurs (une requête par utilisateur pour fiabilité)
      const membersRows = membersData as any[];
      const profilesById: Record<string, any> = {};

      for (const member of membersRows) {
        const userId = member.user_id;
        if (!userId || profilesById[userId]) continue;

        const { data: profile, error: profileError } = await DirectSupabaseService.directSelect(
          'profiles',
          'id,email,first_name,last_name,full_name,avatar_url',
          [{ column: 'id', value: userId }],
          true
        );

        if (!profileError && profile) {
          profilesById[userId] = profile;
        }
      }

      // Combiner les données
      const members: FarmMember[] = membersRows
        .sort((a, b) =>
          new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime()
        )
        .map(member => {
          const profile = profilesById[member.user_id];
          return {
            id: member.id,
            farmId: member.farm_id,
            userId: member.user_id,
            role: member.role,
            permissions: member.permissions,
            isActive: member.is_active,
            joinedAt: member.joined_at,
            updatedAt: member.updated_at,
            user: profile
              ? {
                  id: profile.id,
                  email: profile.email || '',
                  firstName: profile.first_name || '',
                  lastName: profile.last_name || '',
                  createdAt: '',
                  updatedAt: '',
                }
              : undefined,
          };
        });

      return members;
    } catch (error) {
      console.error('Erreur lors de la récupération des membres:', error);
      throw new Error('Impossible de récupérer les membres de la ferme');
    }
  }

  // Récupérer les invitations en attente d'une ferme
  async getFarmInvitations(farmId: number): Promise<FarmInvitation[]> {
    try {
      const { data, error } = await DirectSupabaseService.directSelect(
        'farm_invitations',
        '*',
        [{ column: 'farm_id', value: farmId }]
      );

      if (error) throw new Error(error.message || 'Erreur récupération invitations');

      const now = Date.now();
      const rows = (data || []) as any[];

      const filtered = rows
        .filter(invitation =>
          invitation.status === 'pending' &&
          invitation.expires_at &&
          new Date(invitation.expires_at).getTime() > now
        )
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      return filtered.map((row: any) => mapFarmInvitationRow(row));
    } catch (error) {
      console.error('Erreur lors de la récupération des invitations:', error);
      throw new Error('Impossible de récupérer les invitations');
    }
  }

  // Inviter un nouveau membre
  async inviteMember(farmId: number, inviteData: InviteMemberData): Promise<FarmInvitation> {
    try {
      // Vérifier d'abord si l'utilisateur existe déjà dans les profils
      const { data: existingProfile } = await DirectSupabaseService.directSelect(
        'profiles',
        'id',
        [{ column: 'email', value: inviteData.email }],
        true
      );

      // Si l'utilisateur existe, vérifier s'il n'est pas déjà membre
      if (existingProfile) {
        const { data: existingMember } = await DirectSupabaseService.directSelect(
          'farm_members',
          'id',
          [
            { column: 'farm_id', value: farmId },
            { column: 'user_id', value: (existingProfile as any).id },
            { column: 'is_active', value: true }
          ],
          true
        );

        if (existingMember) {
          throw new Error('Cette personne est déjà membre de la ferme');
        }
      }

      // Vérifier si une invitation est déjà en cours pour cet email
      const { data: existingInvitations, error: existingInvError } =
        await DirectSupabaseService.directSelect(
          'farm_invitations',
          'id,status,expires_at,email,farm_id',
          [
            { column: 'farm_id', value: farmId },
            { column: 'email', value: inviteData.email }
          ]
        );

      if (!existingInvError && existingInvitations && Array.isArray(existingInvitations)) {
        const now = Date.now();
        const activePending = existingInvitations.find((inv: any) =>
          inv.status === 'pending' &&
          inv.expires_at &&
          new Date(inv.expires_at).getTime() > now
        );

        if (activePending) {
          throw new Error('Une invitation est déjà en cours pour cette adresse email');
        }
      }

      // Obtenir l'utilisateur actuel qui fait l'invitation
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Utilisateur non connecté');
      }

      // Créer l'invitation avec une date d'expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expire dans 7 jours

      const { data, error } = await DirectSupabaseService.directInsert(
        'farm_invitations',
        {
          farm_id: farmId,
          email: inviteData.email,
          role: inviteData.role,
          message: inviteData.message || '',
          invited_by: user.id,
          expires_at: expiresAt.toISOString(),
          status: 'pending'
        }
      );

      if (error) {
        console.error('Erreur Supabase lors de l\'insertion (Direct API):', error);
        throw new Error(error.message || 'Erreur création invitation');
      }

      const created = (Array.isArray(data) ? data[0] : data) as FarmInvitation;

      // L'invitation sera visible dans la page "Mes invitations" de l'utilisateur
      console.log('✅ Invitation créée avec succès:', created);
      return created;
    } catch (error) {
      console.error('Erreur lors de l\'invitation:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Impossible d\'envoyer l\'invitation');
    }
  }

  // Supprimer un membre
  async removeMember(farmId: number, memberId: number): Promise<void> {
    try {
      // Vérifier les permissions (ne pas supprimer le propriétaire)
      const { data: member, error: fetchError } = await DirectSupabaseService.directSelect(
        'farm_members',
        'role,user_id',
        [
          { column: 'id', value: memberId },
          { column: 'farm_id', value: farmId }
        ],
        true
      );

      if (fetchError) throw fetchError;

      if (member.role === 'owner') {
        throw new Error('Impossible de supprimer le propriétaire de la ferme');
      }

      // Désactiver le membre au lieu de le supprimer
      const { error } = await DirectSupabaseService.directUpdate(
        'farm_members',
        { is_active: false, updated_at: new Date().toISOString() },
        [
          { column: 'id', value: memberId },
          { column: 'farm_id', value: farmId }
        ]
      );

      if (error) throw new Error(error.message || 'Erreur désactivation membre');
    } catch (error) {
      console.error('Erreur lors de la suppression du membre:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Impossible de supprimer le membre');
    }
  }

  // Modifier le rôle d'un membre
  async updateMemberRole(farmId: number, memberId: number, newRole: UserRole): Promise<FarmMember> {
    try {
      // Vérifier que ce n'est pas le propriétaire
      const { data: member, error: fetchError } = await DirectSupabaseService.directSelect(
        'farm_members',
        'role',
        [
          { column: 'id', value: memberId },
          { column: 'farm_id', value: farmId }
        ],
        true
      );

      if (fetchError) throw fetchError;

      if (member.role === 'owner') {
        throw new Error('Impossible de modifier le rôle du propriétaire');
      }

      // Obtenir les permissions par défaut pour le nouveau rôle
      const permissions = this.getDefaultPermissions(newRole);

      const { data, error } = await DirectSupabaseService.directUpdate(
        'farm_members',
        { 
          role: newRole, 
          permissions,
          updated_at: new Date().toISOString() 
        },
        [
          { column: 'id', value: memberId },
          { column: 'farm_id', value: farmId }
        ]
      );

      if (error) throw new Error(error.message || 'Erreur mise à jour membre');
      const updated = (Array.isArray(data) ? data[0] : data) as any;
      return {
        id: updated.id,
        farmId: updated.farm_id,
        userId: updated.user_id,
        role: updated.role,
        permissions: updated.permissions,
        isActive: updated.is_active,
        joinedAt: updated.joined_at,
        updatedAt: updated.updated_at,
        user: undefined,
      };
    } catch (error) {
      console.error('Erreur lors de la modification du rôle:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Impossible de modifier le rôle du membre');
    }
  }

  // Annuler une invitation
  async cancelInvitation(invitationId: number): Promise<void> {
    try {
      const { error } = await DirectSupabaseService.directUpdate(
        'farm_invitations',
        { 
          status: 'cancelled' as InvitationStatus,
          updated_at: new Date().toISOString() 
        },
        [{ column: 'id', value: invitationId }]
      );

      if (error) throw new Error(error.message || 'Erreur annulation invitation');
    } catch (error) {
      console.error('Erreur lors de l\'annulation de l\'invitation:', error);
      throw new Error('Impossible d\'annuler l\'invitation');
    }
  }

  // Renvoyer une invitation
  async resendInvitation(invitationId: number): Promise<void> {
    try {
      const { data: invitation, error: fetchError } = await DirectSupabaseService.directSelect(
        'farm_invitations',
        '*',
        [{ column: 'id', value: invitationId }],
        true
      );

      if (fetchError) throw fetchError;

      // Mettre à jour la date d'expiration
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      const { error } = await DirectSupabaseService.directUpdate(
        'farm_invitations',
        { 
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString() 
        },
        [{ column: 'id', value: invitationId }]
      );

      if (error) throw new Error(error.message || 'Erreur renvoi invitation');

      // L'invitation mise à jour sera visible dans "Mes invitations"
    } catch (error) {
      console.error('Erreur lors du renvoi de l\'invitation:', error);
      throw new Error('Impossible de renvoyer l\'invitation');
    }
  }

  // Obtenir les permissions par défaut selon le rôle
  private getDefaultPermissions(role: UserRole): MemberPermissions {
    const permissions: Record<UserRole, MemberPermissions> = {
      owner: {
        can_edit_farm: true,
        can_export_data: true,
        can_manage_tasks: true,
        can_invite_members: true,
        can_view_analytics: true,
      },
      manager: {
        can_edit_farm: true,
        can_export_data: true,
        can_manage_tasks: true,
        can_invite_members: true,
        can_view_analytics: true,
      },
      employee: {
        can_edit_farm: false,
        can_export_data: false,
        can_manage_tasks: true,
        can_invite_members: false,
        can_view_analytics: false,
      },
      advisor: {
        can_edit_farm: false,
        can_export_data: true,
        can_manage_tasks: false,
        can_invite_members: false,
        can_view_analytics: true,
      },
      viewer: {
        can_edit_farm: false,
        can_export_data: false,
        can_manage_tasks: false,
        can_invite_members: false,
        can_view_analytics: false,
      },
    };

    return permissions[role];
  }


  // Obtenir le rôle d'un utilisateur dans une ferme
  async getUserRole(farmId: number, userId: string): Promise<UserRole | null> {
    try {
      const { data, error } = await DirectSupabaseService.directSelect(
        'farm_members',
        'role',
        [
          { column: 'farm_id', value: farmId },
          { column: 'user_id', value: userId },
          { column: 'is_active', value: true }
        ],
        true
      );

      if (error) {
        console.warn('Erreur RLS lors de la récupération du rôle (normal si pas membre, Direct API):', error.code);
        return null;
      }
      return data ? (data as any).role : null;
    } catch (error) {
      console.warn('Erreur lors de la récupération du rôle (normal si pas membre):', error);
      return null;
    }
  }

  // Vérifier les permissions d'un utilisateur
  async checkPermission(farmId: number, userId: string, permission: keyof MemberPermissions): Promise<boolean> {
    try {
      const { data, error } = await DirectSupabaseService.directSelect(
        'farm_members',
        'permissions',
        [
          { column: 'farm_id', value: farmId },
          { column: 'user_id', value: userId },
          { column: 'is_active', value: true }
        ],
        true
      );

      if (error || !data) return false;
      const perms = (data as any).permissions as MemberPermissions;
      return !!perms[permission];
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      return false;
    }
  }
}

export const farmMemberService = new FarmMemberService();
