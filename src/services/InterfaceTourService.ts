import AsyncStorage from '@react-native-async-storage/async-storage';

interface InterfaceTourState {
  seen: boolean;
  inProgress: boolean;
  stepIndex: number;
  restoreFarmId: number | null;
}

const DEFAULT_STATE: InterfaceTourState = {
  seen: false,
  inProgress: false,
  stepIndex: 0,
  restoreFarmId: null,
};

const INTERFACE_TOUR_KEY_PREFIX = 'thomas_interface_tour_v1_';

function keyForUser(userId: string): string {
  return `${INTERFACE_TOUR_KEY_PREFIX}${userId}`;
}

function normalizeState(value: unknown): InterfaceTourState {
  if (!value || typeof value !== 'object') return DEFAULT_STATE;
  const raw = value as Partial<InterfaceTourState>;
  return {
    seen: raw.seen === true,
    inProgress: raw.inProgress === true,
    stepIndex: Number.isFinite(raw.stepIndex) ? Math.max(0, Number(raw.stepIndex)) : 0,
    restoreFarmId:
      typeof raw.restoreFarmId === 'number' && Number.isFinite(raw.restoreFarmId)
        ? raw.restoreFarmId
        : null,
  };
}

const InterfaceTourService = {
  async getState(userId: string): Promise<InterfaceTourState> {
    if (!userId) return { ...DEFAULT_STATE, seen: true };
    try {
      const value = await AsyncStorage.getItem(keyForUser(userId));
      if (!value) return DEFAULT_STATE;
      return normalizeState(JSON.parse(value));
    } catch {
      return DEFAULT_STATE;
    }
  },

  async hasSeenTour(userId: string): Promise<boolean> {
    const state = await this.getState(userId);
    return state.seen;
  },

  async startTour(userId: string, restoreFarmId: number | null): Promise<void> {
    if (!userId) return;
    try {
      const current = await this.getState(userId);
      await AsyncStorage.setItem(
        keyForUser(userId),
        JSON.stringify({
          ...current,
          inProgress: true,
          stepIndex: 0,
          restoreFarmId: typeof restoreFarmId === 'number' ? restoreFarmId : null,
        })
      );
    } catch {
      // noop
    }
  },

  async updateStep(userId: string, stepIndex: number): Promise<void> {
    if (!userId) return;
    try {
      const current = await this.getState(userId);
      await AsyncStorage.setItem(
        keyForUser(userId),
        JSON.stringify({
          ...current,
          inProgress: true,
          stepIndex: Math.max(0, stepIndex),
        })
      );
    } catch {
      // noop
    }
  },

  async completeTour(userId: string): Promise<void> {
    if (!userId) return;
    try {
      const current = await this.getState(userId);
      await AsyncStorage.setItem(
        keyForUser(userId),
        JSON.stringify({
          ...current,
          seen: true,
          inProgress: false,
          stepIndex: 0,
          restoreFarmId: null,
        })
      );
    } catch {
      // noop
    }
  },

  async abortTour(userId: string): Promise<void> {
    if (!userId) return;
    try {
      const current = await this.getState(userId);
      await AsyncStorage.setItem(
        keyForUser(userId),
        JSON.stringify({
          ...current,
          inProgress: false,
          stepIndex: 0,
          restoreFarmId: null,
        })
      );
    } catch {
      // noop
    }
  },

  async resetTour(userId: string): Promise<void> {
    if (!userId) return;
    try {
      await AsyncStorage.removeItem(keyForUser(userId));
    } catch {
      // noop
    }
  },
};

export type { InterfaceTourState };
export default InterfaceTourService;
