import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps } from "react-native";
import { Colors } from "../../../constants/Colors";

interface ButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  isLoading?: boolean;
  variant?: "primary" | "outline" | "danger";
}

export const Button = ({ children, isLoading, variant = "primary", style, disabled, ...props }: ButtonProps) => {
  const getBackgroundColor = () => {
    if (disabled) return "#94a3b8"; // slate-400
    if (variant === "outline") return "transparent";
    if (variant === "danger") return Colors.error;
    return Colors.primary;
  };

  const getTextColor = () => {
    if (variant === "outline") return Colors.primary;
    return Colors.white;
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        variant === "outline" && styles.outlineButton,
        style,
      ]}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
  },
});
