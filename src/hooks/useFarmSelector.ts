import { useState, useEffect } from 'react';
import { useFarm } from '../contexts/FarmContext';
import { useNavigation } from '../contexts/NavigationContext';
import type { UserFarm } from '../services/SimpleInitService';

export interface FarmSelectorState {
  showModal: boolean;
  farms: UserFarm[];
  activeFarm: UserFarm | null;
  loading: boolean;
  error: string | null;
}

export interface FarmSelectorActions {
  openFarmSelector: () => void;
  closeFarmSelector: () => void;
  selectFarm: (farm: UserFarm) => Promise<void>;
  createFarm: () => void;
  editFarm: (farmId?: number) => void;
  refreshFarms: () => Promise<void>;
}

export const useFarmSelector = (): FarmSelectorState & FarmSelectorActions => {
  const { farms, activeFarm, loading, error, changeActiveFarm, refreshFarms } = useFarm();
  const { openFarmEdit, openFarmList } = useNavigation();
  const [showModal, setShowModal] = useState(false);

  const openFarmSelector = () => {
    console.log('🏢 [FARM-SELECTOR] Opening farm selector modal');
    setShowModal(true);
  };

  const closeFarmSelector = () => {
    console.log('🏢 [FARM-SELECTOR] Closing farm selector modal');
    setShowModal(false);
  };

  const selectFarm = async (farm: UserFarm) => {
    console.log('🏢 [FARM-SELECTOR] Selecting farm:', farm.farm_name);
    
    try {
      await changeActiveFarm(farm);
      console.log('✅ [FARM-SELECTOR] Farm selected successfully');
    } catch (error) {
      console.error('❌ [FARM-SELECTOR] Error selecting farm:', error);
    }
  };

  const createFarm = () => {
    console.log('🏢 [FARM-SELECTOR] Creating new farm');
    closeFarmSelector();
    openFarmEdit();
  };

  const editFarm = (farmId?: number) => {
    console.log('🏢 [FARM-SELECTOR] Editing farm:', farmId);
    closeFarmSelector();
    openFarmEdit(farmId);
  };

  const manageFarms = () => {
    console.log('🏢 [FARM-SELECTOR] Managing farms');
    closeFarmSelector();
    openFarmList();
  };

  return {
    // State
    showModal,
    farms,
    activeFarm,
    loading,
    error,
    
    // Actions
    openFarmSelector,
    closeFarmSelector,
    selectFarm,
    createFarm,
    editFarm: manageFarms, // Le bouton "Gérer les fermes" ouvre la liste
    refreshFarms,
  };
};











