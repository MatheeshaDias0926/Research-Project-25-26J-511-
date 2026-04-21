import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  contentArea: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    gap: 12,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
});

const alertConfig = {
  success: {
    bg: Colors.success + '15',
    border: Colors.success + '40',
    text: Colors.success,
    icon: 'checkmark-circle',
  },
  error: {
    bg: Colors.error + '15',
    border: Colors.error + '40',
    text: Colors.error,
    icon: 'alert-circle',
  },
  warning: {
    bg: '#FFA50015',
    border: '#FFA50040',
    text: '#FF9800',
    icon: 'alert',
  },
  info: {
    bg: Colors.primary + '15',
    border: Colors.primary + '40',
    text: Colors.primary,
    icon: 'information-circle',
  },
};

export const MobileAlert = ({ type = 'info', title, message, onClose, closable = true }) => {
  const config = alertConfig[type];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.bg, borderColor: config.border },
      ]}
    >
      <View style={styles.contentArea}>
        <View style={styles.iconContainer}>
          <Ionicons name={config.icon} size={20} color={config.text} />
        </View>
        <View style={styles.textContainer}>
          {title && (
            <Text style={[styles.title, { color: config.text }]}>{title}</Text>
          )}
          {message && (
            <Text style={[styles.message, { color: config.text }]}>{message}</Text>
          )}
        </View>
        {closable && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={config.text} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default MobileAlert;
