import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getAllBuses } from "../../src/api/bus";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/context/AuthContext";

export default function BusSelectionScreen() {
    const { data: buses, isLoading, error } = useQuery({
        queryKey: ["buses"],
        queryFn: getAllBuses,
    });

    const { logout } = useAuth();

    const handleSelectBus = (busId) => {
        // Navigate to dashboard with busId param
        router.push({ pathname: "/dashboard", params: { busId } });
    };

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Failed to load buses. Please try again.</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Select Your Bus</Text>
                <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                    <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>Choose the bus you are operating today</Text>

            <FlatList
                data={buses}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => handleSelectBus(item._id)}
                    >
                        <View style={styles.iconContainer}>
                            <Ionicons name="bus" size={32} color="#2563eb" />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.busPlate}>{item.licensePlate}</Text>
                            <Text style={styles.routeInfo}>Route: {item.routeId || "N/A"}</Text>
                            <Text style={styles.capacity}>Capacity: {item.capacity} Seats</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#cbd5e1" />
                    </TouchableOpacity>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        padding: 24,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#0f172a",
    },
    logoutBtn: {
        padding: 8,
    },
    subtitle: {
        paddingHorizontal: 24,
        marginBottom: 16,
        color: "#64748b",
    },
    list: {
        padding: 24,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    iconContainer: {
        width: 56,
        height: 56,
        backgroundColor: "#eff6ff",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
    },
    busPlate: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1e293b",
        marginBottom: 4,
    },
    routeInfo: {
        fontSize: 14,
        color: "#64748b",
        marginBottom: 2,
    },
    capacity: {
        fontSize: 12,
        color: "#94a3b8",
    },
    errorText: {
        color: "#ef4444",
        fontSize: 16,
    },
});
