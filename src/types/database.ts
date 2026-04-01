// Database types for Thomas V2
// Generated from Supabase schema

export interface Database {
  public: {
    Tables: {
      farms: {
        Row: {
          id: number;
          name: string;
          description: string | null;
          address: string | null;
          postal_code: string | null;
          city: string | null;
          region: string | null;
          country: string;
          total_area: number | null;
          farm_type: 'maraichage' | 'arboriculture' | 'grandes_cultures' | 'mixte' | 'autre' | null;
          owner_id: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          description?: string | null;
          address?: string | null;
          postal_code?: string | null;
          city?: string | null;
          region?: string | null;
          country?: string;
          total_area?: number | null;
          farm_type?: 'maraichage' | 'arboriculture' | 'grandes_cultures' | 'mixte' | 'autre' | null;
          owner_id: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          description?: string | null;
          address?: string | null;
          postal_code?: string | null;
          city?: string | null;
          region?: string | null;
          country?: string;
          total_area?: number | null;
          farm_type?: 'maraichage' | 'arboriculture' | 'grandes_cultures' | 'mixte' | 'autre' | null;
          owner_id?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      farm_members: {
        Row: {
          id: number;
          farm_id: number;
          user_id: string;
          role: 'owner' | 'manager' | 'employee' | 'advisor' | 'viewer';
          permissions: Record<string, any>;
          is_active: boolean;
          joined_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          farm_id: number;
          user_id: string;
          role: 'owner' | 'manager' | 'employee' | 'advisor' | 'viewer';
          permissions?: Record<string, any>;
          is_active?: boolean;
          joined_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          farm_id?: number;
          user_id?: string;
          role?: 'owner' | 'manager' | 'employee' | 'advisor' | 'viewer';
          permissions?: Record<string, any>;
          is_active?: boolean;
          joined_at?: string;
          updated_at?: string;
        };
      };
      farm_invitations: {
        Row: {
          id: number;
          farm_id: number;
          invited_by: string;
          email: string;
          role: 'manager' | 'employee' | 'advisor' | 'viewer';
          message: string | null;
          invitation_token: string;
          expires_at: string;
          status: 'pending' | 'accepted' | 'expired' | 'cancelled';
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          farm_id: number;
          invited_by: string;
          email: string;
          role: 'manager' | 'employee' | 'advisor' | 'viewer';
          message?: string | null;
          invitation_token?: string;
          expires_at?: string;
          status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          farm_id?: number;
          invited_by?: string;
          email?: string;
          role?: 'manager' | 'employee' | 'advisor' | 'viewer';
          message?: string | null;
          invitation_token?: string;
          expires_at?: string;
          status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          first_name: string | null;
          last_name: string | null;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          bio: string | null;
          profession: string | null;
          language: string;
          timezone: string | null;
          notification_preferences: Record<string, any>;
          latest_active_farm_id: number | null;
          last_app_version: string | null;
          last_build_version: string | null;
          last_runtime_version: string | null;
          last_update_id: string | null;
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          bio?: string | null;
          profession?: string | null;
          language?: string;
          timezone?: string | null;
          notification_preferences?: Record<string, any>;
          latest_active_farm_id?: number | null;
          last_app_version?: string | null;
          last_build_version?: string | null;
          last_runtime_version?: string | null;
          last_update_id?: string | null;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          bio?: string | null;
          profession?: string | null;
          language?: string;
          timezone?: string | null;
          notification_preferences?: Record<string, any>;
          latest_active_farm_id?: number | null;
          last_app_version?: string | null;
          last_build_version?: string | null;
          last_runtime_version?: string | null;
          last_update_id?: string | null;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      plots: {
        Row: {
          id: number;
          farm_id: number;
          name: string;
          code: string | null;
          type: 'serre_plastique' | 'serre_verre' | 'plein_champ' | 'tunnel' | 'hydroponique' | 'pepiniere' | 'autre';
          length: number | null;
          width: number | null;
          surface_area: number | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          farm_id: number;
          name: string;
          code?: string | null;
          type: 'serre_plastique' | 'serre_verre' | 'plein_champ' | 'tunnel' | 'hydroponique' | 'pepiniere' | 'autre';
          length?: number | null;
          width?: number | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          farm_id?: number;
          name?: string;
          code?: string | null;
          type?: 'serre_plastique' | 'serre_verre' | 'plein_champ' | 'tunnel' | 'hydroponique' | 'pepiniere' | 'autre';
          length?: number | null;
          width?: number | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      materials: {
        Row: {
          id: number;
          farm_id: number;
          name: string;
          category: 'tracteurs' | 'outils_tracteur' | 'outils_manuels' | 'materiel_marketing' | 'petit_equipement' | 'autre';
          model: string | null;
          brand: string | null;
          description: string | null;
          cost: number | null;
          purchase_date: string | null;
          supplier: string | null;
          condition_notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          farm_id: number;
          name: string;
          category: 'tracteurs' | 'outils_tracteur' | 'outils_manuels' | 'materiel_marketing' | 'petit_equipement' | 'autre';
          model?: string | null;
          brand?: string | null;
          description?: string | null;
          cost?: number | null;
          purchase_date?: string | null;
          supplier?: string | null;
          condition_notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          farm_id?: number;
          name?: string;
          category?: 'tracteurs' | 'outils_tracteur' | 'outils_manuels' | 'materiel_marketing' | 'petit_equipement' | 'autre';
          model?: string | null;
          brand?: string | null;
          description?: string | null;
          cost?: number | null;
          purchase_date?: string | null;
          supplier?: string | null;
          condition_notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          farm_id: number;
          user_id: string;
          title: string;
          description: string | null;
          category: 'production' | 'marketing' | 'administratif' | 'general' | null;
          type: 'tache' | 'observation' | 'commentaire' | 'question' | 'autre' | null;
          date: string;
          time: string | null;
          duration_minutes: number | null;
          status: 'en_attente' | 'en_cours' | 'terminee' | 'annulee' | 'archivee';
          priority: 'basse' | 'moyenne' | 'haute' | 'urgente';
          plot_ids: number[];
          material_ids: number[];
          notes: string | null;
          number_of_people: number;
          quantity_nature: string | null;
          quantity_type: 'engrais' | 'produit_phyto' | 'recolte' | 'plantation' | 'vente' | 'autre' | null;
          phytosanitary_product_amm: string | null;
          recurring_template_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farm_id: number;
          user_id: string;
          title: string;
          description?: string | null;
          category?: 'production' | 'marketing' | 'administratif' | 'general' | null;
          type?: 'tache' | 'observation' | 'commentaire' | 'question' | 'autre' | null;
          date: string;
          time?: string | null;
          duration_minutes?: number | null;
          status?: 'en_attente' | 'en_cours' | 'terminee' | 'annulee' | 'archivee';
          priority?: 'basse' | 'moyenne' | 'haute' | 'urgente';
          plot_ids?: number[];
          material_ids?: number[];
          notes?: string | null;
          number_of_people?: number;
          quantity_nature?: string | null;
          quantity_type?: 'engrais' | 'produit_phyto' | 'recolte' | 'plantation' | 'vente' | 'autre' | null;
          phytosanitary_product_amm?: string | null;
          recurring_template_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: number;
          user_id?: string;
          title?: string;
          description?: string | null;
          category?: 'production' | 'marketing' | 'administratif' | 'general' | null;
          type?: 'tache' | 'observation' | 'commentaire' | 'question' | 'autre' | null;
          date?: string;
          quantity_nature?: string | null;
          quantity_type?: 'engrais' | 'produit_phyto' | 'recolte' | 'plantation' | 'vente' | 'autre' | null;
          phytosanitary_product_amm?: string | null;
          time?: string | null;
          duration_minutes?: number | null;
          status?: 'en_attente' | 'en_cours' | 'terminee' | 'annulee' | 'archivee';
          priority?: 'basse' | 'moyenne' | 'haute' | 'urgente';
          plot_ids?: number[];
          material_ids?: number[];
          notes?: string | null;
          number_of_people?: number;
          recurring_template_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          farm_id: number;
          user_id: string;
          title: string;
          message: string;
          reminder_time: string;
          selected_days: number[];
          is_active: boolean;
          notification_type: 'custom' | 'system' | 'task_reminder';
          metadata: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          farm_id: number;
          user_id: string;
          title: string;
          message: string;
          reminder_time: string;
          selected_days: number[];
          is_active?: boolean;
          notification_type?: 'custom' | 'system' | 'task_reminder';
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          farm_id?: number;
          user_id?: string;
          title?: string;
          message?: string;
          reminder_time?: string;
          selected_days?: number[];
          is_active?: boolean;
          notification_type?: 'custom' | 'system' | 'task_reminder';
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
      notification_logs: {
        Row: {
          id: string;
          notification_id: string;
          user_id: string;
          sent_at: string;
          status: 'sent' | 'failed' | 'read';
          error_message: string | null;
          metadata: Record<string, any>;
        };
        Insert: {
          id?: string;
          notification_id: string;
          user_id: string;
          sent_at?: string;
          status?: 'sent' | 'failed' | 'read';
          error_message?: string | null;
          metadata?: Record<string, any>;
        };
        Update: {
          id?: string;
          notification_id?: string;
          user_id?: string;
          sent_at?: string;
          status?: 'sent' | 'failed' | 'read';
          error_message?: string | null;
          metadata?: Record<string, any>;
        };
      };
    };
    Functions: {
      get_user_farms: {
        Args: Record<PropertyKey, never>;
        Returns: {
          farm_id: number;
          farm_name: string;
          role: string;
          is_owner: boolean;
        }[];
      };
      user_has_farm_permission: {
        Args: {
          p_farm_id: number;
          p_permission: string;
        };
        Returns: boolean;
      };
    };
  };
}
