import { DirectSupabaseService } from './DirectSupabaseService';
import type { UserFarm } from './SimpleInitService';

const DEMO_FARM_NAME = 'Ferme Demo Thomas Interface Tour';
const DEMO_OWNER_ID = '00000000-0000-0000-0000-000000000001';

async function getDemoFarmRow(): Promise<{ id: number; name: string } | null> {
  const farmRes = await DirectSupabaseService.directSelect(
    'farms',
    'id,name',
    [
      { column: 'name', value: DEMO_FARM_NAME },
      { column: 'owner_id', value: DEMO_OWNER_ID },
      { column: 'is_active', value: true },
    ],
    true
  );

  if (farmRes.error || !farmRes.data) return null;
  return farmRes.data as { id: number; name: string };
}

const DemoFarmService = {
  DEMO_FARM_NAME,

  async getDemoFarmForUser(userId: string): Promise<UserFarm | null> {
    if (!userId) return null;
    const farm = await getDemoFarmRow();
    if (!farm) return null;

    const membershipRes = await DirectSupabaseService.directSelect(
      'farm_members',
      'farm_id,role,is_active',
      [
        { column: 'farm_id', value: farm.id },
        { column: 'user_id', value: userId },
      ],
      true
    );

    if (membershipRes.error || !membershipRes.data) return null;

    const membership = membershipRes.data as { role: string; is_active: boolean };
    if (membership.is_active !== true) return null;

    return {
      farm_id: farm.id,
      farm_name: farm.name,
      role: membership.role || 'viewer',
      is_owner: false,
    };
  },

  async ensureDemoMembership(userId: string): Promise<UserFarm | null> {
    if (!userId) return null;
    const farm = await getDemoFarmRow();
    if (!farm) return null;

    const existingMembership = await DirectSupabaseService.directSelect(
      'farm_members',
      'id,farm_id,role,is_active',
      [
        { column: 'farm_id', value: farm.id },
        { column: 'user_id', value: userId },
      ],
      true
    );

    if (!existingMembership.error && existingMembership.data) {
      const row = existingMembership.data as { id: number; role: string; is_active: boolean };
      if (row.is_active === false) {
        await DirectSupabaseService.directUpdate('farm_members', { is_active: true, role: 'viewer' }, [
          { column: 'id', value: row.id },
        ]);
      }
      return {
        farm_id: farm.id,
        farm_name: farm.name,
        role: 'viewer',
        is_owner: false,
      };
    }

    await DirectSupabaseService.directInsert('farm_members', {
      farm_id: farm.id,
      user_id: userId,
      role: 'viewer',
      permissions: {
        can_edit_farm: false,
        can_export_data: false,
        can_manage_tasks: false,
        can_invite_members: false,
        can_view_analytics: true,
      },
      is_active: true,
    });

    return {
      farm_id: farm.id,
      farm_name: farm.name,
      role: 'viewer',
      is_owner: false,
    };
  },
};

export default DemoFarmService;
