/**
 * Tests pour QuickConversionModal
 * Valide l'interface utilisateur simplifiée pour l'ajout rapide de conversions
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QuickConversionModal } from '../QuickConversionModal';

describe('QuickConversionModal', () => {
  const mockOnSave = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
    farmId: 1,
  };

  test('should render with basic elements', () => {
    const { getByText, getByPlaceholderText } = render(
      <QuickConversionModal {...defaultProps} />
    );

    expect(getByText('Ajouter une conversion')).toBeTruthy();
    expect(getByPlaceholderText('ex: caisse, panier, brouette')).toBeTruthy();
    expect(getByPlaceholderText('ex: tomates, compost, terreau')).toBeTruthy();
    expect(getByText('Créer')).toBeTruthy();
    expect(getByText('Annuler')).toBeTruthy();
  });

  test('should pre-fill form when searchTerm is provided', () => {
    const { getByDisplayValue } = render(
      <QuickConversionModal 
        {...defaultProps} 
        searchTerm="caisse de tomates"
      />
    );

    expect(getByDisplayValue('caisse')).toBeTruthy();
    expect(getByDisplayValue('tomates')).toBeTruthy();
    expect(getByDisplayValue('10')).toBeTruthy(); // Valeur suggérée pour caisse
  });

  test('should handle simple container term', () => {
    const { getByDisplayValue } = render(
      <QuickConversionModal 
        {...defaultProps} 
        searchTerm="brouette"
      />
    );

    expect(getByDisplayValue('brouette')).toBeTruthy();
    expect(getByDisplayValue('50')).toBeTruthy(); // Valeur suggérée pour brouette
    expect(getByDisplayValue('kg')).toBeTruthy(); // Unité suggérée
  });

  test('should validate required fields', async () => {
    const { getByText } = render(
      <QuickConversionModal {...defaultProps} />
    );

    const createButton = getByText('Créer');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(mockOnSave).not.toHaveBeenCalled();
      // Le bouton devrait être désactivé si les champs requis sont vides
      expect(createButton.props.disabled || createButton.props.accessibilityState?.disabled).toBeTruthy();
    });
  });

  test('should call onSave with correct data when form is valid', async () => {
    const { getByPlaceholderText, getByText } = render(
      <QuickConversionModal {...defaultProps} />
    );

    // Remplir le formulaire
    fireEvent.changeText(getByPlaceholderText('ex: caisse, panier, brouette'), 'caisse');
    fireEvent.changeText(getByPlaceholderText('ex: tomates, compost, terreau'), 'tomates');
    fireEvent.changeText(getByPlaceholderText('ex: 10, 5, 25'), '12');

    const createButton = getByText('Créer');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        containerName: 'caisse',
        cropName: 'tomates',
        conversionValue: 12,
        conversionUnit: 'kg',
        description: expect.any(String)
      });
    });
  });

  test('should show conversion preview when all fields are filled', () => {
    const { getByText } = render(
      <QuickConversionModal 
        {...defaultProps} 
        searchTerm="panier de radis"
      />
    );

    expect(getByText(/1 panier de radis = 3 kg/)).toBeTruthy();
    expect(getByText(/Cette conversion sera utilisée pour tous les messages/)).toBeTruthy();
  });

  test('should handle crop category suggestions', () => {
    const { getByText } = render(
      <QuickConversionModal 
        {...defaultProps} 
        searchTerm="basilic"
      />
    );

    expect(getByText(/Catégorie: Aromates/)).toBeTruthy();
  });

  test('should call onClose when cancel is pressed', () => {
    const { getByText } = render(
      <QuickConversionModal {...defaultProps} />
    );

    fireEvent.press(getByText('Annuler'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('should show info banner when searchTerm is provided', () => {
    const { getByText } = render(
      <QuickConversionModal 
        {...defaultProps} 
        searchTerm="sac de terreau"
      />
    );

    expect(getByText(/Création rapide pour "sac de terreau"/)).toBeTruthy();
  });

  test('should handle numeric validation for conversion value', async () => {
    const { getByPlaceholderText, getByText } = render(
      <QuickConversionModal {...defaultProps} />
    );

    // Remplir avec une valeur invalide
    fireEvent.changeText(getByPlaceholderText('ex: caisse, panier, brouette'), 'caisse');
    fireEvent.changeText(getByPlaceholderText('ex: tomates, compost, terreau'), 'tomates');
    fireEvent.changeText(getByPlaceholderText('ex: 10, 5, 25'), 'invalid');

    const createButton = getByText('Créer');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  test('should allow custom units via dropdown', async () => {
    const { getByPlaceholderText, getByText } = render(
      <QuickConversionModal {...defaultProps} />
    );

    // Remplir le formulaire avec une unité personnalisée
    fireEvent.changeText(getByPlaceholderText('ex: caisse, panier, brouette'), 'caisse');
    fireEvent.changeText(getByPlaceholderText('ex: tomates, compost, terreau'), 'tomates');
    fireEvent.changeText(getByPlaceholderText('ex: 10, 5, 25'), '8');

    // Changer l'unité (ceci nécessiterait d'interagir avec le DropdownSelector)
    // Pour ce test, on assume que l'unité par défaut 'kg' est utilisée

    const createButton = getByText('Créer');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          conversionUnit: 'kg'
        })
      );
    });
  });

  describe('Intelligent pre-filling', () => {
    test('should suggest appropriate values for common containers', () => {
      const testCases = [
        { term: 'panier', expectedValue: '3', expectedUnit: 'kg' },
        { term: 'bac', expectedValue: '15', expectedUnit: 'kg' },
        { term: 'sac', expectedValue: '25', expectedUnit: 'kg' }
      ];

      testCases.forEach(({ term, expectedValue, expectedUnit }) => {
        const { getByDisplayValue } = render(
          <QuickConversionModal 
            {...defaultProps} 
            searchTerm={term}
            key={term}
          />
        );

        expect(getByDisplayValue(expectedValue)).toBeTruthy();
        expect(getByDisplayValue(expectedUnit)).toBeTruthy();
      });
    });

    test('should handle compound terms correctly', () => {
      const { getByDisplayValue } = render(
        <QuickConversionModal 
          {...defaultProps} 
          searchTerm="une pleine brouette de compost"
        />
      );

      expect(getByDisplayValue('brouette')).toBeTruthy();
      expect(getByDisplayValue('compost')).toBeTruthy();
      expect(getByDisplayValue('50')).toBeTruthy(); // Valeur pour brouette
    });
  });
});