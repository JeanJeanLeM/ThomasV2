import React, { useCallback, useEffect, useRef } from 'react';
import { View, ViewStyle } from 'react-native';
import { useInterfaceTourTargets } from '@/contexts/InterfaceTourTargetsContext';

interface InterfaceTourTargetProps {
  targetId: string;
  children: React.ReactNode;
  style?: ViewStyle;
  enabled?: boolean;
}

const InterfaceTourTarget: React.FC<InterfaceTourTargetProps> = ({
  targetId,
  children,
  style,
  enabled = true,
}) => {
  const targetRef = useRef<any>(null);
  const { registerTargetRef, unregisterTargetRef, measureTarget } = useInterfaceTourTargets();

  useEffect(() => {
    if (!enabled) {
      unregisterTargetRef(targetId);
      return;
    }

    registerTargetRef(targetId, targetRef.current);
    const timeout = setTimeout(() => {
      measureTarget(targetId);
    }, 30);

    return () => {
      clearTimeout(timeout);
      unregisterTargetRef(targetId);
    };
  }, [enabled, measureTarget, registerTargetRef, targetId, unregisterTargetRef]);

  const handleLayout = useCallback(() => {
    if (!enabled) return;
    registerTargetRef(targetId, targetRef.current);
    measureTarget(targetId);
  }, [enabled, measureTarget, registerTargetRef, targetId]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <View ref={targetRef} collapsable={false} onLayout={handleLayout} style={style}>
      {children}
    </View>
  );
};

export default InterfaceTourTarget;
