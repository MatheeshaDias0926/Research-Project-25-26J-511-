import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/Colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  small: {
    padding: 8,
  },
  medium: {
    padding: 16,
  },
  large: {
    padding: 24,
  },
});

export const MobileLoadingSpinner = ({ size = 'medium', color = Colors.primary }) => {
  const sizeMap = {
    small: 'small',
    medium: 'large',
    large: 'large',
  };

  const paddingMap = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large,
  };

  return (
    <View style={[styles.container, paddingMap[size]]}>
      <ActivityIndicator size={sizeMap[size]} color={color} />
    </View>
  );
};

export default MobileLoadingSpinner;
