import { supabase } from '../utils/supabase';
import { DirectSupabaseService } from './DirectSupabaseService';
import type { Database } from '../types/database';

// Types from database
type Farm = Database['public']['Tables']['farms']['Row'];
type FarmInsert = Database['public']['Tables']['farms']['Insert'];
type FarmUpdate = Database['public']['Tables']['farms']['Update'];

type FarmMember = Database['public']['Tables']['farm_members']['Row'];
type FarmMemberInsert = Database['public']['Tables']['farm_members']['Insert'];

// Extended types for UI
export interface FarmWithMembers extends Farm {
  members?: FarmMember[];
  member_count?: number;
  user_role?: string;
}


/**
 * Service for managing farms with multi-tenant support
 */
export class FarmService {
  
  /**
   * Get all farms accessible to the current user (API direct - plus de cache)
   */
  static async getUserFarms(): Promise<FarmWithMembers[]> {
    console.log('🌐 [API] Récupération des fermes depuis Supabase');
    
    // Vérifier d'abord l'utilisateur connecté avec gestion JWT
    let user = null;
    let userError = null;
    
    try {
      const authResult = await supabase.auth.getUser();
      user = authResult.data.user;
      userError = authResult.error;
    } catch (error) {
      console.error('❌ [AUTH] Exception getUser:', error);
      userError = error;
    }
    
    // Gestion spécifique de l'erreur JWT invalide
    if (userError && userError.message?.includes('User from sub claim in JWT does not exist')) {
      console.error('🚨 [AUTH] Session JWT invalide détectée dans FarmService');
      
      try {
        // Forcer la déconnexion
        await supabase.auth.signOut();
        console.log('✅ [AUTH] Déconnexion forcée depuis FarmService');
      } catch (signOutError) {
        console.error('❌ [AUTH] Erreur déconnexion forcée:', signOutError);
      }
      
      // Déclencher un rechargement de la page pour réinitialiser l'AuthContext
      if (typeof window !== 'undefined') {
        console.log('🔄 [AUTH] Rechargement de la page pour réinitialiser la session');
        window.location.reload();
      }
      
      throw new Error('Session expirée - Veuillez vous reconnecter');
    }
    
    if (userError) {
      console.error('❌ [AUTH] Erreur utilisateur:', userError);
      throw new Error('Utilisateur non connecté');
    }
    
    if (!user) {
      console.error('❌ [AUTH] Aucun utilisateur connecté');
      throw new Error('Utilisateur non connecté');
    }

    try {
      console.log('📡 [API] Exécution de la requête Supabase (Direct API pour data)...');
      console.log('👤 [API] User ID pour la requête:', user.id);
      
      // Récupérer les farm_members pour l'utilisateur via API directe
      const { data: memberData, error: memberError } = await DirectSupabaseService.directSelect(
        'farm_members',
        'farm_id,role,is_active,user_id',
        [
          { column: 'user_id', value: user.id },
          { column: 'is_active', value: true }
        ]
      );

      if (memberError) {
        console.error('❌ [API] Erreur lors de la récupération des farm_members (Direct API):', memberError);
        throw new Error(memberError.message || 'Erreur récupération membres de ferme');
      }

      if (!memberData || memberData.length === 0) {
        console.log('⚠️ [API] Aucun farm_member trouvé pour cet utilisateur');
        return [];
      }

      // Récupérer les détails des fermes pour chaque id (petit volume) via API directe
      const farmIds = (memberData as any[]).map(m => m.farm_id);
      
      const farmResults = await Promise.all(
        farmIds.map(farmId =>
          DirectSupabaseService.directSelect(
            'farms',
            '*',
            [{ column: 'id', value: farmId }],
            true
          )
        )
      );

      const farms = farmResults
        .filter(r => !r.error && r.data)
        .map(r => r.data as Farm);

      console.log('✅ [API] Fermes récupérées (Direct API):', farms.length);

      // Transform data to include user role (en utilisant les données de memberData)
      const membersArray = memberData as any[];
      const transformedFarms = farms.map(farm => {
        const memberInfo = membersArray.find(m => m.farm_id === farm.id);
        return {
          ...farm,
          user_role: memberInfo?.role || 'owner',
          member_count: membersArray.filter(m => m.farm_id === farm.id).length
        } as FarmWithMembers;
      });
      
      return transformedFarms;

    } catch (error) {
      console.error('❌ [API] Erreur lors du chargement des fermes:', error);
      return [];
    }
  }


  /**
   * Get a specific farm by ID (with permission check via RLS)
   */
  static async getFarmById(farmId: number): Promise<FarmWithMembers | null> {
    try {
      const { data, error } = await DirectSupabaseService.directSelect(
        'farms',
        `
          *,
          farm_members (
            id,
            user_id,
            role,
            permissions,
            is_active,
            joined_at,
            profiles (
              full_name,
              email,
              avatar_url
            )
          )
        `,
        [{ column: 'id', value: farmId }],
        true
      );

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Farm not found or no access
        }
        throw new Error(error.message || 'Erreur récupération ferme');
      }

      const farm: any = data;

      return {
        ...farm,
        members: farm.farm_members?.filter((member: any) => member.is_active) || [],
        member_count: farm.farm_members?.filter((member: any) => member.is_active).length || 0
      } as FarmWithMembers;

    } catch (error) {
      console.error('Error fetching farm:', error);
      throw new Error('Impossible de récupérer la ferme');
    }
  }

  /**
   * Create a new farm (user becomes owner)
   */
  static async createFarm(farmData: Omit<FarmInsert, 'owner_id'>, userId?: string): Promise<Farm> {
    try {
      let user_id = userId;
      
      if (!user_id) {
        // Essayer d'abord getSession (plus fiable sur web)
        let user = null;
        try {
          const { data: { session } } = await supabase.auth.getSession();
          user = session?.user || null;
        } catch (sessionError) {
          const { data: { user: fallbackUser } } = await supabase.auth.getUser();
          user = fallbackUser;
        }
        
        if (!user) {
          throw new Error('Utilisateur non connecté');
        }
        
        user_id = user.id;
      }

      // Create the farm
      const farmInsertData = {
        ...farmData,
        owner_id: user_id
      };
      
      const { data: createdFarm, error: farmError } = await DirectSupabaseService.directInsert(
        'farms',
        farmInsertData
      );

      if (farmError) {
        throw new Error(farmError.message || 'Erreur création ferme');
      }

      const farm = (Array.isArray(createdFarm) ? createdFarm[0] : createdFarm) as Farm;

      // Create the farm_member entry for the owner
      const memberInsertData = {
        farm_id: farm.id,
        user_id: user_id,
        role: 'owner',
        permissions: ["read", "write", "delete", "manage_members"],
        is_active: true
      };
      
      const { error: memberError } = await DirectSupabaseService.directInsert(
        'farm_members',
        memberInsertData
      );

      if (memberError) {
        console.error('❌ Erreur lors de la création du farm_member (Direct API):', memberError);
        // Don't throw here, the farm is created, just log the error
      }
      
      return farm;

    } catch (error) {
      console.error('❌ Erreur lors de la création de la ferme:', error);
      
      // Gestion spécifique de l'erreur de canal de message
      if (error instanceof Error && error.message.includes('message channel closed')) {
        throw new Error('Erreur d\'authentification. Veuillez vous reconnecter.');
      }
      
      throw new Error('Impossible de créer la ferme');
    }
  }

  /**
   * Update a farm (owner only)
   */
  static async updateFarm(farmId: number, updates: FarmUpdate): Promise<Farm> {
    try {
      const { data, error } = await DirectSupabaseService.directUpdate(
        'farms',
        updates,
        [{ column: 'id', value: farmId }]
      );

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Ferme non trouvée ou accès non autorisé');
        }
        throw new Error(error.message || 'Erreur mise à jour ferme');
      }
      
      const farm = (Array.isArray(data) ? data[0] : data) as Farm;
      return farm;

    } catch (error) {
      console.error('Error updating farm:', error);
      throw new Error('Impossible de mettre à jour la ferme');
    }
  }

  /**
   * Delete a farm (owner only)
   */
  static async deleteFarm(farmId: number): Promise<void> {
    try {
      const { error } = await DirectSupabaseService.directDelete(
        'farms',
        [{ column: 'id', value: farmId }]
      );

      if (error) throw new Error(error.message || 'Erreur suppression ferme');


    } catch (error) {
      console.error('Error deleting farm:', error);
      throw new Error('Impossible de supprimer la ferme');
    }
  }

  /**
   * Check if user has specific permission on farm
   */
  static async hasPermission(farmId: number, permission: string): Promise<boolean> {
    try {
      const { data, error } = await DirectSupabaseService.directRPC(
        'user_has_farm_permission',
        {
          p_farm_id: farmId,
          p_permission: permission
        }
      );

      if (error) throw new Error(error.message || 'Erreur vérification permission');
      return !!data;

    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Get farm statistics
   */
  static async getFarmStats(farmId: number) {
    try {
      // Get counts in parallel via Direct API (compter côté client)
      const [plotsResult, materialsResult, tasksResult, membersResult] = await Promise.all([
        DirectSupabaseService.directSelect(
          'plots',
          'id',
          [
            { column: 'farm_id', value: farmId },
            { column: 'is_active', value: true }
          ]
        ),
        DirectSupabaseService.directSelect(
          'materials',
          'id',
          [
            { column: 'farm_id', value: farmId },
            { column: 'is_active', value: true }
          ]
        ),
        DirectSupabaseService.directSelect(
          'tasks',
          'id',
          [{ column: 'farm_id', value: farmId }]
        ),
        DirectSupabaseService.directSelect(
          'farm_members',
          'id',
          [
            { column: 'farm_id', value: farmId },
            { column: 'is_active', value: true }
          ]
        )
      ]);

      return {
        plots_count: Array.isArray(plotsResult.data) ? plotsResult.data.length : 0,
        materials_count: Array.isArray(materialsResult.data) ? materialsResult.data.length : 0,
        tasks_count: Array.isArray(tasksResult.data) ? tasksResult.data.length : 0,
        members_count: Array.isArray(membersResult.data) ? membersResult.data.length : 0
      };

    } catch (error) {
      console.error('Error fetching farm stats:', error);
      return {
        plots_count: 0,
        materials_count: 0,
        tasks_count: 0,
        members_count: 0
      };
    }
  }

  /**
   * Search farms by name (for current user)
   */
  static async searchFarms(query: string): Promise<FarmWithMembers[]> {
    try {
      // Récupérer les fermes et membres via API directe puis filtrer côté client
      const { data, error } = await DirectSupabaseService.directSelect(
        'farms',
        `
          *,
          farm_members!inner (
            role,
            is_active
          )
        `
      );

      if (error) throw new Error(error.message || 'Erreur recherche fermes');

      const lowerQuery = query.toLowerCase();
      const farms = (data || []).filter((farm: any) => {
        const nameMatch = (farm.name || '').toLowerCase().includes(lowerQuery);
        const hasActiveMember = Array.isArray(farm.farm_members)
          ? farm.farm_members.some((m: any) => m.is_active)
          : false;
        return nameMatch && hasActiveMember;
      });

      return farms.map((farm: any) => ({
        ...farm,
        user_role: farm.farm_members?.[0]?.role || 'owner'
      })) as FarmWithMembers[];

    } catch (error) {
      console.error('Error searching farms:', error);
      throw new Error('Erreur lors de la recherche');
    }
  }
}
