import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";
import { Colors } from "../../../constants/Colors";

export const Card = ({ style, children, ...props }: ViewProps) => {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, // Matches web's 0 4px 24px rgba(0,0,0,0.08)
    shadowRadius: 24,
    elevation: 4,
    width: "100%",
  },
});
