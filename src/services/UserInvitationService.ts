import { supabase } from '../utils/supabase';
import { DirectSupabaseService } from './DirectSupabaseService';
import { mapFarmInvitationRow } from '../utils/farmInvitationMapper';
import type { FarmInvitation, InvitationStatus } from '../types';

export class UserInvitationService {
  // Récupérer les invitations de l'utilisateur actuel
  async getUserInvitations(userEmail: string): Promise<FarmInvitation[]> {
    try {
      const { data, error } = await DirectSupabaseService.directSelect(
        'farm_invitations',
        `
          *,
          farms!farm_invitations_farm_id_fkey(
            id,
            name,
            description,
            farm_type
          )
        `,
        [{ column: 'email', value: userEmail }]
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
      throw new Error('Impossible de récupérer vos invitations');
    }
  }

  // Accepter une invitation
  async acceptInvitation(invitationId: number): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Récupérer l'invitation via API directe
      const { data: invitation, error: invitationError } = await DirectSupabaseService.directSelect(
        'farm_invitations',
        '*',
        [{ column: 'id', value: invitationId }],
        true
      );

      if (invitationError) throw new Error(invitationError.message || 'Erreur récupération invitation');
      if (!invitation) throw new Error('Invitation non trouvée');

      // Vérifier que l'invitation n'a pas expiré
      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('Cette invitation a expiré');
      }

      // Vérifier que l'email correspond
      if (invitation.email !== user.email) {
        throw new Error('Cette invitation ne vous est pas destinée');
      }

      // Vérifier si l'utilisateur n'est pas déjà membre
      const { data: existingMember } = await DirectSupabaseService.directSelect(
        'farm_members',
        'id',
        [
          { column: 'farm_id', value: invitation.farm_id },
          { column: 'user_id', value: user.id },
          { column: 'is_active', value: true }
        ],
        true
      );

      if (existingMember) {
        throw new Error('Vous êtes déjà membre de cette ferme');
      }

      // Créer / mettre à jour le profil utilisateur
      const profilePayload = {
        id: user.id,
        email: user.email,
        first_name: user.user_metadata?.['first_name'] || '',
        last_name: user.user_metadata?.['last_name'] || ''
      };

      try {
        const { data: existingProfile, error: fetchProfileError } =
          await DirectSupabaseService.directSelect(
            'profiles',
            'id',
            [{ column: 'id', value: user.id }],
            true
          );

        if (fetchProfileError) {
          console.error('Erreur lecture profil (Direct API):', fetchProfileError);
        } else if (existingProfile) {
          const { error: updateError } = await DirectSupabaseService.directUpdate(
            'profiles',
            profilePayload,
            [{ column: 'id', value: user.id }]
          );
          if (updateError) {
            console.error('Erreur mise à jour profil (Direct API):', updateError);
          }
        } else {
          const { error: insertError } = await DirectSupabaseService.directInsert(
            'profiles',
            profilePayload
          );
          if (insertError) {
            console.error('Erreur création profil (Direct API):', insertError);
          }
        }
      } catch (profileError) {
        console.error('Erreur profil (bloc Direct API):', profileError);
      }

      // Ajouter l'utilisateur comme membre de la ferme
      const { error: memberError } = await DirectSupabaseService.directInsert(
        'farm_members',
        {
          farm_id: invitation.farm_id,
          user_id: user.id,
          role: invitation.role,
          permissions: this.getDefaultPermissions(invitation.role)
        }
      );

      if (memberError) throw new Error(memberError.message || 'Erreur ajout membre');

      // Marquer l'invitation comme acceptée
      const { error: updateError } = await DirectSupabaseService.directUpdate(
        'farm_invitations',
        {
          status: 'accepted' as InvitationStatus,
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
          updated_at: new Date().toISOString()
        },
        [{ column: 'id', value: invitationId }]
      );

      if (updateError) throw new Error(updateError.message || 'Erreur mise à jour invitation');
    } catch (error) {
      console.error('Erreur lors de l\'acceptation de l\'invitation:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Impossible d\'accepter l\'invitation');
    }
  }

  // Refuser une invitation
  async declineInvitation(invitationId: number): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Vérifier que l'invitation appartient à l'utilisateur
      const { data: invitation, error: invitationError } = await DirectSupabaseService.directSelect(
        'farm_invitations',
        'email',
        [{ column: 'id', value: invitationId }],
        true
      );

      if (invitationError) throw new Error(invitationError.message || 'Erreur récupération invitation');
      if (!invitation || (invitation as any).email !== user.email) {
        throw new Error('Cette invitation ne vous est pas destinée');
      }

      // Marquer l'invitation comme annulée
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
      console.error('Erreur lors du refus de l\'invitation:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Impossible de refuser l\'invitation');
    }
  }

  // Compter les invitations en attente
  async getInvitationCount(userEmail: string): Promise<number> {
    try {
      const { data, error } = await DirectSupabaseService.directSelect(
        'farm_invitations',
        'id,status,expires_at,email',
        [{ column: 'email', value: userEmail }]
      );

      if (error) throw new Error(error.message || 'Erreur comptage invitations');

      const now = Date.now();
      const rows = (data || []) as any[];

      const pendingCount = rows.filter(invitation =>
        invitation.status === 'pending' &&
        invitation.expires_at &&
        new Date(invitation.expires_at).getTime() > now
      ).length;

      return pendingCount;
    } catch (error) {
      console.error('Erreur lors du comptage des invitations:', error);
      return 0;
    }
  }

  // Obtenir les permissions par défaut selon le rôle
  private getDefaultPermissions(role: string) {
    const permissions = {
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

    return permissions[role as keyof typeof permissions] || permissions.viewer;
  }
}

export const userInvitationService = new UserInvitationService();



