import React from 'react';
import { View, ScrollView } from 'react-native';
import { Screen, Text, Card } from '../design-system/components';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';

export default function DashboardScreen() {
  return (
    <Screen backgroundColor={colors.background.secondary}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        {/* Vue d'ensemble */}
        <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
          <Text variant="h3" color={colors.text.primary} style={{ marginBottom: spacing.md }}>
            Vue d'ensemble
          </Text>
          
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between',
            marginBottom: spacing.sm 
          }}>
            <Text variant="body" color={colors.gray[600]}>Fermes actives</Text>
            <Text variant="bodyBold" color={colors.primary[600]}>3</Text>
          </View>
          
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between',
            marginBottom: spacing.sm 
          }}>
            <Text variant="body" color={colors.gray[600]}>Tâches en cours</Text>
            <Text variant="bodyBold" color={colors.semantic.warning}>12</Text>
          </View>
          
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between' 
          }}>
            <Text variant="body" color={colors.gray[600]}>Parcelles</Text>
            <Text variant="bodyBold" color={colors.semantic.success}>28</Text>
          </View>
        </Card>

        {/* Tâches urgentes */}
        <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
          <Text variant="h3" color={colors.text.primary} style={{ marginBottom: spacing.md }}>
            Tâches urgentes
          </Text>
          
          <Card variant="outlined" style={{ marginBottom: spacing.sm }}>
            <Text variant="bodyBold" color={colors.text.primary}>
              Récolte tomates cerises
            </Text>
            <Text variant="bodySmall" color={colors.gray[600]}>
              Ferme Bio des Collines • Aujourd'hui 7h00
            </Text>
          </Card>
          
          <Card variant="outlined" style={{ marginBottom: spacing.sm }}>
            <Text variant="bodyBold" color={colors.text.primary}>
              Préparation sol verger
            </Text>
            <Text variant="bodySmall" color={colors.gray[600]}>
              GAEC du Soleil Levant • Dans 5 jours
            </Text>
          </Card>
        </Card>

        {/* Météo */}
        <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
          <Text variant="h3" color={colors.text.primary} style={{ marginBottom: spacing.md }}>
            Météo du jour
          </Text>
          
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center',
            justifyContent: 'space-between' 
          }}>
            <View>
              <Text variant="h2" color={colors.text.primary}>18°C</Text>
              <Text variant="body" color={colors.gray[600]}>Partiellement nuageux</Text>
            </View>
            <Text style={{ fontSize: 48 }}>⛅</Text>
          </View>
        </Card>

        {/* Actions rapides */}
        <Card variant="elevated">
          <Text variant="h3" color={colors.text.primary} style={{ marginBottom: spacing.md }}>
            Actions rapides
          </Text>
          
          <Text variant="body" color={colors.gray[600]} align="center">
            Utilisez Thomas IA pour créer rapidement des tâches, 
            observer vos cultures ou obtenir des conseils personnalisés.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
