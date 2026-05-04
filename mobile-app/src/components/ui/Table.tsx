import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../../constants/Colors';

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerCell: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  headerCellLast: {
    borderRightWidth: 0,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowAlternate: {
    backgroundColor: Colors.surface,
  },
  cell: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  cellLast: {
    borderRightWidth: 0,
  },
  cellText: {
    fontSize: 13,
    color: Colors.text,
  },
  emptyContainer: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

export const MobileTable = ({ columns, data, loading = false, empty = 'No data' }) => {
  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Loading...</Text>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{empty}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {columns.map((col, idx) => (
          <View
            key={col.key}
            style={[styles.headerCell, idx === columns.length - 1 && styles.headerCellLast]}
          >
            <Text style={styles.headerText}>{col.label}</Text>
          </View>
        ))}
      </View>

      {/* Rows */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {data.map((row, rowIdx) => (
            <View
              key={rowIdx}
              style={[
                styles.row,
                rowIdx === data.length - 1 && styles.rowLast,
                rowIdx % 2 === 1 && styles.rowAlternate,
              ]}
            >
              {columns.map((col, colIdx) => (
                <View
                  key={`${rowIdx}-${col.key}`}
                  style={[styles.cell, colIdx === columns.length - 1 && styles.cellLast]}
                >
                  <Text style={styles.cellText}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default MobileTable;
