import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { ClipboardDocumentListIcon, PencilIcon, CheckmarkIcon, XIcon } from '../../icons';
import type { RecurringTaskTemplate } from '../../../types';
import { formatRecurrence } from '../../../services/RecurringTaskService';

export interface RecurringTaskCardStandardProps {
  template: RecurringTaskTemplate;
  onPress?: (template: RecurringTaskTemplate) => void;
  onEdit?: (template: RecurringTaskTemplate) => void;
  onToggleActive?: (template: RecurringTaskTemplate) => void;
  style?: ViewStyle;
  showActions?: boolean;
}

const CATEGORY_COLORS: Record<RecurringTaskTemplate['category'], string> = {
  production: colors.primary[600],
  marketing: colors.secondary.purple,
  administratif: colors.semantic.warning,
  general: colors.gray[600],
};

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${m}` : `${h}h`;
}

function formatPeriod(t: RecurringTaskTemplate): string {
  if (t.is_permanent) return 'Toute l’année';
  const monthNames = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const start = monthNames[t.start_month] ?? '';
  const end = monthNames[t.end_month] ?? '';
  return `${start}–${end}`;
}

export const RecurringTaskCardStandard: React.FC<RecurringTaskCardStandardProps> = ({
  template,
  onPress,
  onEdit,
  onToggleActive,
  style,
  showActions = true,
}) => {
  const isActive = template.is_active !== false;
  const statusColor = isActive ? colors.semantic.success : colors.gray[500];
  const statusBg = isActive ? colors.semantic.success + '20' : colors.gray[200];
  const borderColor = CATEGORY_COLORS[template.category] ?? colors.gray[500];

  return (
    <TouchableOpacity
      style={[
        {
          backgroundColor: colors.background.secondary,
          borderRadius: 12,
          borderLeftWidth: 4,
          borderLeftColor: borderColor,
          padding: spacing.lg,
          marginBottom: spacing.md,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        style,
      ]}
      onPress={() => onPress?.(template)}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.gray[100],
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing.md,
          }}
        >
          <ClipboardDocumentListIcon color={borderColor} size={24} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
            <Text variant="h4" style={{ color: colors.text.primary, flex: 1 }} numberOfLines={1}>
              {template.name}
            </Text>
            {showActions && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <View
                  style={{
                    backgroundColor: statusBg,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    borderRadius: 999,
                  }}
                >
                  <Text variant="caption" style={{ color: statusColor, fontSize: 11, fontWeight: '500' }}>
                    {isActive ? 'Actif' : 'Inactif'}
                  </Text>
                </View>
                {onEdit && (
                  <TouchableOpacity
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: colors.gray[100],
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={(e) => {
                      e.stopPropagation();
                      onEdit(template);
                    }}
                  >
                    <PencilIcon color={colors.primary[600]} size={16} />
                  </TouchableOpacity>
                )}
                {onToggleActive && (
                  <TouchableOpacity
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: colors.gray[100],
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={(e) => {
                      e.stopPropagation();
                      onToggleActive(template);
                    }}
                  >
                    {isActive ? (
                      <XIcon color={colors.semantic.error} size={16} />
                    ) : (
                      <CheckmarkIcon color={colors.semantic.success} size={16} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {template.action ? (
            <Text variant="body" style={{ color: colors.text.secondary, marginBottom: spacing.xs }} numberOfLines={1}>
              {template.action}
            </Text>
          ) : null}

          <Text variant="caption" style={{ color: colors.text.secondary, marginBottom: spacing.xs }}>
            {formatRecurrence(template)}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Text variant="caption" style={{ color: colors.text.secondary }}>
              {formatPeriod(template)}
            </Text>
            <Text variant="caption" style={{ color: colors.text.secondary, fontWeight: '600' }}>
              {formatDuration(template.duration_minutes)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
