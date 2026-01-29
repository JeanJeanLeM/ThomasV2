import React from 'react';
import {
  View,
  TouchableOpacity,
  ViewStyle,
  Platform,
} from 'react-native';
import { colors } from '../colors';
import { spacing } from '../spacing';
import { Text } from './Text';

export interface NavigationTab {
  id: string;
  title: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  badge?: number;
  disabled?: boolean;
}

export interface NavigationProps {
  tabs: NavigationTab[];
  activeTab: string;
  onTabPress: (tabId: string) => void;
  backgroundColor?: string;
  style?: ViewStyle;
}

export const Navigation: React.FC<NavigationProps> = ({
  tabs,
  activeTab,
  onTabPress,
  backgroundColor = colors.background.primary,
  style,
}) => {
  // Container styles
  const getContainerStyle = (): ViewStyle => ({
    flexDirection: 'row',
    backgroundColor,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
    paddingTop: spacing.sm,
    shadowColor: colors.gray[900],
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 8,
  });

  // Tab styles
  const getTabStyle = (): ViewStyle => ({
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    minHeight: spacing.navigation.tabHeight - spacing.lg - spacing.sm,
  });

  // Tab content styles
  const getTabContentStyle = (): ViewStyle => ({
    alignItems: 'center',
    justifyContent: 'center',
  });

  // Badge styles
  const getBadgeStyle = (): ViewStyle => ({
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.semantic.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  });

  // Icon container styles
  const getIconContainerStyle = (): ViewStyle => ({
    marginBottom: spacing.xs,
    position: 'relative',
  });

  const renderTab = (tab: NavigationTab) => {
    const isActive = activeTab === tab.id;
    const iconColor = isActive ? colors.primary[600] : colors.gray[500];
    const textColor = isActive ? colors.primary[600] : colors.gray[500];

    return (
      <TouchableOpacity
        key={tab.id}
        style={getTabStyle()}
        onPress={() => onTabPress(tab.id)}
        disabled={tab.disabled}
        activeOpacity={0.7}
      >
        <View style={getTabContentStyle()}>
          {/* Icon */}
          <View style={getIconContainerStyle()}>
            {isActive && tab.activeIcon ? (
              React.cloneElement(tab.activeIcon as React.ReactElement, {
                color: iconColor,
                size: 24,
              })
            ) : (
              React.cloneElement(tab.icon as React.ReactElement, {
                color: iconColor,
                size: 24,
              })
            )}
            
            {/* Badge */}
            {tab.badge && tab.badge > 0 && (
              <View style={getBadgeStyle()}>
                <Text
                  variant="caption"
                  color={colors.text.inverse}
                  style={{ fontSize: 10, fontWeight: '600' }}
                >
                  {tab.badge > 99 ? '99+' : tab.badge.toString()}
                </Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text
            variant="caption"
            color={textColor}
            style={{
              fontSize: 11,
              fontWeight: isActive ? '600' : '400',
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {tab.title}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[getContainerStyle(), style]}>
      {tabs.map(renderTab)}
    </View>
  );
};
