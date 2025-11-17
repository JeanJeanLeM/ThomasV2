// Constantes pour l'application Thomas V2

export const APP_CONFIG = {
  NAME: 'Thomas V2',
  VERSION: '1.0.0',
  DESCRIPTION: 'Assistant Agricole IA',
} as const;

// Design Tokens selon spécifications techniques
export const COLORS = {
  primary: {
    50: '#f0fdf4', // Vert agriculture très clair
    100: '#dcfce7',
    500: '#22c55e', // Vert principal
    600: '#16a34a',
    900: '#14532d',
  },
  secondary: {
    500: '#3b82f6', // Bleu planning
    600: '#2563eb',
  },
  warning: {
    500: '#f59e0b', // Orange observations
    600: '#d97706',
  },
  error: {
    500: '#ef4444', // Rouge traitements
    600: '#dc2626',
  },
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    300: '#d1d5db',
    500: '#6b7280',
    600: '#4b5563',
    900: '#111827',
  },
} as const;

export const TYPOGRAPHY = {
  families: {
    sans: 'Inter',
    mono: 'JetBrains Mono',
  },
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// Messages français pour l'authentification
export const AUTH_MESSAGES_FR = {
  errors: {
    invalid_credentials: 'Email ou mot de passe incorrect',
    email_not_confirmed: 'Veuillez confirmer votre email avant de vous connecter',
    user_not_found: 'Aucun compte trouvé avec cet email',
    weak_password:
      'Le mot de passe doit contenir au moins 8 caractères, 1 chiffre et 1 caractère spécial',
    email_already_used: 'Cet email est déjà utilisé',
    google_auth_cancelled: 'Connexion Google annulée',
    apple_auth_failed: 'Échec de la connexion Apple',
    network_error: 'Problème de connexion, vérifiez votre réseau',
  },
  success: {
    signup_complete: 'Compte créé ! Vérifiez votre email pour confirmer',
    password_reset_sent: 'Email de réinitialisation envoyé',
    signin_success: 'Connexion réussie, bienvenue !',
    signout_success: 'Déconnexion réussie',
  },
} as const;

// Permissions par rôle
export const ROLE_PERMISSIONS = {
  Owner: [
    'farm:read',
    'farm:update',
    'farm:delete',
    'members:read',
    'members:invite',
    'members:remove',
    'members:update_role',
    'plots:create',
    'plots:read',
    'plots:update',
    'plots:delete',
    'materials:create',
    'materials:read',
    'materials:update',
    'materials:delete',
    'tasks:create',
    'tasks:read',
    'tasks:update',
    'tasks:delete',
    'observations:create',
    'observations:read',
    'observations:update',
    'observations:delete',
  ],
  Manager: [
    'farm:read',
    'members:read',
    'members:invite',
    'plots:create',
    'plots:read',
    'plots:update',
    'materials:create',
    'materials:read',
    'materials:update',
    'tasks:create',
    'tasks:read',
    'tasks:update',
    'tasks:delete',
    'observations:create',
    'observations:read',
    'observations:update',
  ],
  Employee: [
    'farm:read',
    'members:read',
    'plots:read',
    'materials:read',
    'tasks:create',
    'tasks:read',
    'tasks:update:own',
    'observations:create',
    'observations:read',
  ],
} as const;
