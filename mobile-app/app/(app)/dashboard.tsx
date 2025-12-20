import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getBusStatus } from "../../src/api/bus";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";

// Sound for alerts (optional placeholder logic)
const playAlertSound = async () => {
    // Implementation would go here
};

export default function DashboardScreen() {
    const { busId } = useLocalSearchParams();
    const [sound, setSound] = useState();

    // Poll every 3 seconds
    const { data, error, isLoading } = useQuery({
        queryKey: ["busStatus", busId],
        queryFn: () => getBusStatus(busId),
        refetchInterval: 3000,
    });

    const bus = data?.bus;
    const status = data?.currentStatus || {};

    // Derived state
    const occupancy = status.currentOccupancy || 0;
    const capacity = bus?.capacity || 55;
    const occupancyPercentage = Math.round((occupancy / capacity) * 100);
    const isOvercrowded = occupancy > capacity;
    const isFootboard = status.footboardStatus;
    const speed = status.speed || 0;

    // Alert Logic
    useEffect(() => {
        if (isFootboard || isOvercrowded) {
            // Trigger sound or vibration here
        }
    }, [isFootboard, isOvercrowded]);

    if (isLoading && !data) {
        return (
            <View style={styles.center}>
                <Text>Loading Dashboard...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Error loading bus data</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.btnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Dashboard</Text>
                    <Text style={styles.busId}>{bus?.licensePlate}</Text>
                </View>
                <TouchableOpacity
                    style={styles.maintenanceBtn}
                    onPress={() => router.push({ pathname: "/maintenance", params: { busId } })}
                >
                    <Ionicons name="construct" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Alerts Section */}
                {isFootboard && (
                    <View style={[styles.alertCard, styles.dangerAlert]}>
                        <Ionicons name="warning" size={32} color="#fff" />
                        <View style={styles.alertTextContainer}>
                            <Text style={styles.alertTitle}>FOOTBOARD DETECTED</Text>
                            <Text style={styles.alertDesc}>Passenger on footboard! Stop immediately.</Text>
                        </View>
                    </View>
                )}

                {isOvercrowded && (
                    <View style={[styles.alertCard, styles.warningAlert]}>
                        <Ionicons name="people" size={32} color="#fff" />
                        <View style={styles.alertTextContainer}>
                            <Text style={styles.alertTitle}>OVERCROWDED</Text>
                            <Text style={styles.alertDesc}>Bus is above capacity limit.</Text>
                        </View>
                    </View>
                )}

                {/* Speed Card */}
                <View style={styles.mainStatCard}>
                    <Text style={styles.statLabel}>Current Speed</Text>
                    <Text style={styles.speedValue}>{speed} <Text style={styles.unit}>km/h</Text></Text>
                </View>

                {/* Occupancy Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Occupancy</Text>
                        <Text style={styles.occupancyValue}>{occupancy} / {capacity}</Text>
                    </View>

                    <View style={styles.progressBarContainer}>
                        <View
                            style={[
                                styles.progressBar,
                                {
                                    width: `${Math.min(occupancyPercentage, 100)}%`,
                                    backgroundColor: isOvercrowded ? "#ef4444" : occupancyPercentage > 80 ? "#f59e0b" : "#22c55e"
                                }
                            ]}
                        />
                    </View>
                    <Text style={styles.percentageText}>{occupancyPercentage}% Full</Text>
                </View>

                {/* GPS Info (Placeholder for Map) */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Location</Text>
                        <Ionicons name="location" size={20} color="#64748b" />
                    </View>
                    <Text style={styles.gpsText}>
                        Lat: {status.gps?.lat?.toFixed(4) || "N/A"},
                        Lng: {status.gps?.lon?.toFixed(4) || "N/A"}
                    </Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f1f5f9",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        backgroundColor: "#2563eb",
        padding: 24,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    headerTitle: {
        color: "#bfdbfe",
        fontSize: 14,
        fontWeight: "600",
    },
    busId: {
        color: "#fff",
        fontSize: 24,
        fontWeight: "bold",
    },
    maintenanceBtn: {
        backgroundColor: "rgba(255,255,255,0.2)",
        padding: 12,
        borderRadius: 12,
    },
    content: {
        padding: 20,
        gap: 16,
    },
    alertCard: {
        padding: 16,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    dangerAlert: {
        backgroundColor: "#ef4444",
    },
    warningAlert: {
        backgroundColor: "#f97316",
    },
    alertTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    alertTitle: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    alertDesc: {
        color: "rgba(255,255,255,0.9)",
        fontSize: 14,
    },
    mainStatCard: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 32,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    statLabel: {
        color: "#64748b",
        fontSize: 16,
        marginBottom: 8,
    },
    speedValue: {
        fontSize: 48,
        fontWeight: "800",
        color: "#0f172a",
    },
    unit: {
        fontSize: 20,
        color: "#94a3b8",
        fontWeight: "500",
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1e293b",
    },
    occupancyValue: {
        fontSize: 18,
        fontWeight: "700",
        color: "#334155",
    },
    progressBarContainer: {
        height: 12,
        backgroundColor: "#e2e8f0",
        borderRadius: 6,
        overflow: "hidden",
        marginBottom: 8,
    },
    progressBar: {
        height: "100%",
        borderRadius: 6,
    },
    percentageText: {
        textAlign: "right",
        color: "#64748b",
        fontSize: 14,
    },
    gpsText: {
        color: "#334155",
        fontSize: 16,
        fontFamily: "monospace",
    },
    errorText: {
        marginBottom: 10,
        color: "red"
    },
    backBtn: {
        padding: 10,
        backgroundColor: "#ddd",
        borderRadius: 8
    },
    btnText: {
        fontWeight: "bold"
    }
});
