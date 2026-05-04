import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  items: {
    backgroundColor: Colors.surface,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemLast: {
    borderBottomWidth: 0,
  },
  itemText: {
    fontSize: 14,
    color: Colors.text,
  },
  itemTextActive: {
    fontWeight: '600',
    color: Colors.primary,
  },
});

export const MobileDropdown = ({ label, items, value, onChange, placeholder = 'Select...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedItem = items.find((item) => item.value === value);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        style={styles.header}
      >
        <Text style={styles.headerText}>
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.textSecondary}
        />
      </TouchableOpacity>

      {isOpen && (
        <ScrollView style={styles.items} scrollEnabled={items.length > 5}>
          {items.map((item, index) => (
            <TouchableOpacity
              key={item.value}
              style={[styles.item, index === items.length - 1 && styles.itemLast]}
              onPress={() => {
                onChange(item.value);
                setIsOpen(false);
              }}
            >
              <Text
                style={[
                  styles.itemText,
                  value === item.value && styles.itemTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default MobileDropdown;
