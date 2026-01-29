import { Alert, Platform } from 'react-native';

/**
 * Utilitaire pour gérer les alertes de manière compatible web/mobile
 */

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export const showAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[]
): void => {
  if (Platform.OS === 'web') {
    // Implémentation web avec confirm/prompt natif
    if (buttons && buttons.length > 1) {
      const confirmMessage = `${title}\n\n${message || ''}`;
      
      // Trouver le bouton destructif/principal
      const destructiveButton = buttons.find(b => b.style === 'destructive');
      const cancelButton = buttons.find(b => b.style === 'cancel');
      
      if (destructiveButton) {
        const confirmed = window.confirm(confirmMessage);
        if (confirmed && destructiveButton.onPress) {
          destructiveButton.onPress();
        } else if (!confirmed && cancelButton?.onPress) {
          cancelButton.onPress();
        }
      } else {
        // Simple alert
        window.alert(confirmMessage);
        const defaultButton = buttons.find(b => b.style !== 'cancel');
        if (defaultButton?.onPress) {
          defaultButton.onPress();
        }
      }
    } else {
      // Simple alert
      window.alert(`${title}\n\n${message || ''}`);
      if (buttons?.[0]?.onPress) {
        buttons[0].onPress();
      }
    }
  } else {
    // Utiliser Alert.alert natif sur mobile
    Alert.alert(title, message, buttons);
  }
};

export const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
): void => {
  showAlert(title, message, [
    {
      text: 'Annuler',
      style: 'cancel',
      onPress: onCancel,
    },
    {
      text: 'Confirmer',
      style: 'destructive',
      onPress: onConfirm,
    },
  ]);
};

export const showDeleteConfirm = (
  itemName: string,
  onDelete: () => void,
  onCancel?: () => void
): void => {
  showAlert(
    'Supprimer l\'élément',
    `Êtes-vous sûr de vouloir supprimer "${itemName}" ?\n\nCette action est irréversible.`,
    [
      {
        text: 'Annuler',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: onDelete,
      },
    ]
  );
};

export const showSuccess = (
  title: string,
  message?: string,
  onOk?: () => void
): void => {
  showAlert(title, message, [
    {
      text: 'OK',
      onPress: onOk,
    },
  ]);
};

export const showError = (
  title: string,
  message?: string,
  onOk?: () => void
): void => {
  showAlert(title, message, [
    {
      text: 'OK',
      onPress: onOk,
    },
  ]);
};













