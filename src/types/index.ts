// Types de base pour l'application Thomas V2

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Farm {
  id: number;
  name: string;
  description?: string;
  farmType: 'maraichage' | 'arboriculture' | 'grandes_cultures' | 'autre';
  address: {
    street?: string;
    city: string;
    postalCode: string;
    department: string;
    region: string;
  };
  settings: Record<string, unknown>;
  totalArea?: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FarmMember {
  id: number;
  farmId: number;
  userId: string;
  role: UserRole;
  permissions: string[];
  isActive: boolean;
  joinedAt: string;
}

export type UserRole = 'Owner' | 'Manager' | 'Employee';

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: AuthError;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
}

export interface AuthError {
  code: string;
  message: string;
  details?: unknown;
}

// Types pour Thomas IA
export interface AIContext {
  user: User;
  farm: Farm;
  plots: Plot[];
  materials: Material[];
  recentTasks: Task[];
  recentMessages: ChatMessage[];
  seasonalContext: {
    month: number;
    season: 'printemps' | 'été' | 'automne' | 'hiver';
    weatherForecast?: WeatherData;
  };
}

export interface Plot {
  id: number;
  name: string;
  description?: string;
  farmId: number;
  area: number;
  areaUnit: 'm²' | 'hectare' | 'are';
  plotType: string;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: number;
  name: string;
  category: string;
  farmId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  action: string;
  farmId: number;
  plotId?: number;
  materialId?: number;
  duration?: number;
  quantity?: {
    value: number;
    unit: string;
    type: 'surface' | 'volume' | 'nombre' | 'poids';
  };
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  farmId: number;
  metadata?: Record<string, unknown>;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  forecast: string;
}
