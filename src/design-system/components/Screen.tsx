import React from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  ViewStyle,
  ScrollViewProps,
  StatusBar,
} from 'react-native';
import { colors } from '../colors';
import { spacing } from '../spacing';

export interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  safeArea?: boolean;
  backgroundColor?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  statusBarStyle?: 'light-content' | 'dark-content' | 'default';
  statusBarBackgroundColor?: string;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  scrollViewProps?: Omit<ScrollViewProps, 'children' | 'style' | 'contentContainerStyle'>;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  scrollable = false,
  safeArea = true,
  backgroundColor = colors.background.primary,
  padding = 'md',
  statusBarStyle = 'dark-content',
  statusBarBackgroundColor = colors.background.primary,
  style,
  contentContainerStyle,
  scrollViewProps,
}) => {
  // Container styles
  const getContainerStyle = (): ViewStyle => ({
    flex: 1,
    backgroundColor,
  });

  // Content styles
  const getContentStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flex: 1,
    };

    // Add padding
    switch (padding) {
      case 'none':
        break;
      case 'sm':
        baseStyle.padding = spacing.sm;
        break;
      case 'md':
        baseStyle.padding = spacing.layout.screenPadding;
        break;
      case 'lg':
        baseStyle.padding = spacing.xl;
        break;
    }

    return baseStyle;
  };

  // Scroll view content container style
  const getScrollContentStyle = (): ViewStyle => ({
    flexGrow: 1,
    ...getContentStyle(),
  });

  const Container = safeArea ? SafeAreaView : View;

  const renderContent = () => {
    if (scrollable) {
      return (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[getScrollContentStyle(), contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      );
    }

    return (
      <View style={[getContentStyle(), contentContainerStyle]}>
        {children}
      </View>
    );
  };

  return (
    <Container style={[getContainerStyle(), style]}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarBackgroundColor}
        translucent={false}
      />
      {renderContent()}
    </Container>
  );
};
