import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { DatePicker } from './DatePicker';
import { Text } from './Text';
import { Button } from './Button';
import { colors } from '../colors';
import { spacing } from '../spacing';

export const DatePickerExample: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [eventDate, setEventDate] = useState<Date | undefined>();

  const handleReset = () => {
    setSelectedDate(new Date());
    setBirthDate(undefined);
    setEventDate(undefined);
  };

  return (
    <ScrollView style={{
      flex: 1,
      backgroundColor: colors.background.primary,
      padding: spacing.lg,
    }}>
      <Text variant="h2" style={{ marginBottom: spacing.lg, textAlign: 'center' }}>
        DatePicker Examples
      </Text>

      {/* Exemple basique */}
      <View style={{
        backgroundColor: colors.background.secondary,
        padding: spacing.lg,
        borderRadius: 12,
        marginBottom: spacing.lg,
      }}>
        <Text variant="h4" style={{ marginBottom: spacing.md }}>
          Exemple basique
        </Text>
        
        <DatePicker
          label="Date sélectionnée"
          value={selectedDate}
          onChange={setSelectedDate}
          placeholder="Choisir une date"
          hint="Sélectionnez une date quelconque"
        />

        {selectedDate && (
          <Text variant="body" style={{ 
            marginTop: spacing.sm,
            color: colors.primary[600],
            fontWeight: '600'
          }}>
            📅 Date sélectionnée : {selectedDate.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        )}
      </View>

      {/* Exemple avec contraintes */}
      <View style={{
        backgroundColor: colors.background.secondary,
        padding: spacing.lg,
        borderRadius: 12,
        marginBottom: spacing.lg,
      }}>
        <Text variant="h4" style={{ marginBottom: spacing.md }}>
          Avec contraintes (date de naissance)
        </Text>
        
        <DatePicker
          label="Date de naissance"
          value={birthDate}
          onChange={setBirthDate}
          placeholder="Sélectionner votre date de naissance"
          maxDate={new Date()} // Pas de date future
          minDate={new Date(1900, 0, 1)} // Pas avant 1900
          hint="Vous ne pouvez pas sélectionner une date future"
          required
        />

        {birthDate && (
          <Text variant="body" style={{ 
            marginTop: spacing.sm,
            color: colors.success[600],
            fontWeight: '600'
          }}>
            🎂 Né(e) le : {birthDate.toLocaleDateString('fr-FR')}
            {' '}({Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))} ans)
          </Text>
        )}
      </View>

      {/* Exemple avec erreur */}
      <View style={{
        backgroundColor: colors.background.secondary,
        padding: spacing.lg,
        borderRadius: 12,
        marginBottom: spacing.lg,
      }}>
        <Text variant="h4" style={{ marginBottom: spacing.md }}>
          Avec validation d'erreur
        </Text>
        
        <DatePicker
          label="Date d'événement futur"
          value={eventDate}
          onChange={setEventDate}
          placeholder="Sélectionner une date future"
          minDate={new Date()} // Seulement dates futures
          error={eventDate && eventDate < new Date() ? "La date doit être dans le futur" : undefined}
          hint="Sélectionnez une date future pour votre événement"
          required
        />

        {eventDate && eventDate >= new Date() && (
          <Text variant="body" style={{ 
            marginTop: spacing.sm,
            color: colors.primary[600],
            fontWeight: '600'
          }}>
            🎉 Événement prévu le : {eventDate.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={{
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
      }}>
        <Button
          title="Réinitialiser"
          variant="outline"
          onPress={handleReset}
          style={{ flex: 1 }}
        />
        <Button
          title="Aujourd'hui"
          variant="primary"
          onPress={() => setSelectedDate(new Date())}
          style={{ flex: 1 }}
        />
      </View>

      {/* Informations techniques */}
      <View style={{
        backgroundColor: colors.gray[50],
        padding: spacing.md,
        borderRadius: 8,
        marginTop: spacing.xl,
      }}>
        <Text variant="caption" color={colors.text.secondary}>
          💡 Le DatePicker s'adapte automatiquement :
          {'\n'}• Sur mobile : Modal avec sélecteurs tactiles
          {'\n'}• Sur web : Input HTML natif pour les tests
          {'\n'}• Validation automatique des contraintes min/max
          {'\n'}• Formatage français automatique
        </Text>
      </View>
    </ScrollView>
  );
};



