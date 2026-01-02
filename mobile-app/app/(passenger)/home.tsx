import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Platform } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { busApi } from "../../src/api/bus";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/context/AuthContext";

export default function PassengerHome() {
    const [buses, setBuses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();
    const navigation = useNavigation();
    const { logout } = useAuth();
    
    // Header Right
    React.useLayoutEffect(() => {
         navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity onPress={logout} style={{ marginRight: 16 }}>
                    <Ionicons name="log-out-outline" size={24} color={Colors.text} />
                </TouchableOpacity>
            )
         });
    }, [navigation]);

    const fetchBuses = async () => {
        try {
            const data = await busApi.getAll();
            setBuses(data);
        } catch (error) {
            console.error("Failed to fetch buses", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBuses();
        // Auto refresh every 30s like web
        const interval = setInterval(fetchBuses, 30000);
        return () => clearInterval(interval);
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchBuses();
    };

    const getOccupancyLevel = (current: number, capacity: number) => {
        const percentage = (current / capacity) * 100;
        if (percentage > 90) return { label: "High", color: Colors.error, bg: Colors.error };
        if (percentage > 50) return { label: "Medium", color: Colors.warning, bg: Colors.warning };
        return { label: "Low", color: Colors.success, bg: Colors.success };
    };

    return (
        <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.pageTitle}>Live Bus Tracker</Text>
                    <Text style={styles.pageSubtitle}>Real-time updates</Text>
                </View>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{buses.length} Active</Text>
                </View>
            </View>

            {loading && !refreshing ? (
                <Text style={styles.loadingText}>Loading live data...</Text>
            ) : buses.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="bus-outline" size={48} color={Colors.textSecondary} />
                    <Text style={styles.emptyText}>No active buses found.</Text>
                </View>
            ) : (
                buses.map((bus) => {
                    const status = bus.currentStatus || {};
                    const currentOccupancy = status.currentOccupancy || 0;
                    const capacity = bus.capacity || 55;
                    const occupancyLevel = getOccupancyLevel(currentOccupancy, capacity);
                    const occupancyPct = Math.min((currentOccupancy / capacity) * 100, 100);

                    return (
                        <Card key={bus.id || bus._id} style={styles.busCard}>
                            {/* Card Header */}
                            <View style={styles.cardHeader}>
                                <View style={styles.busIdentity}>
                                    <View style={styles.iconBox}>
                                        <Ionicons name="bus" size={20} color={Colors.primary} />
                                    </View>
                                    <View>
                                        <Text style={styles.licensePlate}>{bus.licensePlate || bus.busNumber}</Text>
                                        <View style={styles.routeRow}>
                                            <Ionicons name="git-network-outline" size={12} color={Colors.textSecondary} />
                                            <Text style={styles.routeText}>Route {bus.routeId || bus.routeNumber}</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: bus.currentStatus ? Colors.successBg : Colors.iconBackground }]}>
                                    <Text style={[styles.statusText, { color: bus.currentStatus ? Colors.success : Colors.textSecondary }]}>
                                        {bus.currentStatus ? "Live" : "Inactive"}
                                    </Text>
                                </View>
                            </View>

                            {/* Divider */}
                            <View style={styles.divider} />

                            {/* Occupancy Section */}
                            <View style={styles.section}>
                                <View style={styles.occupancyHeader}>
                                    <View style={styles.labelRow}>
                                        <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
                                        <Text style={styles.labelText}>Crowding</Text>
                                    </View>
                                    <Text style={[styles.occupancyValue, { color: occupancyLevel.color }]}>
                                        {occupancyLevel.label} ({currentOccupancy}/{capacity})
                                    </Text>
                                </View>
                                <View style={styles.progressBarBg}>
                                    <View style={[styles.progressBarFill, { width: `${occupancyPct}%`, backgroundColor: occupancyLevel.bg }]} />
                                </View>
                            </View>

                            {/* Telemetry Grid */}
                            <View style={styles.grid}>
                                {/* Speed Widget */}
                                <View style={styles.gridItem}>
                                    <View style={styles.labelRow}>
                                        <Ionicons name="speedometer-outline" size={14} color={Colors.textSecondary} />
                                        <Text style={styles.labelText}>Speed</Text>
                                    </View>
                                    <View style={styles.valueRow}>
                                        <Text style={styles.bigValue}>{status.speed || 0}</Text>
                                        <Text style={styles.unit}>km/h</Text>
                                    </View>
                                </View>

                                {/* Safety Widget */}
                                <View style={styles.gridItem}>
                                    <View style={styles.labelRow}>
                                        <Ionicons name="shield-checkmark-outline" size={14} color={Colors.textSecondary} />
                                        <Text style={styles.labelText}>Safety</Text>
                                    </View>
                                    {status.footboardStatus ? (
                                         <View style={styles.safetyViolation}>
                                             <Ionicons name="warning" size={14} color={Colors.error} />
                                             <Text style={styles.violationText}>Violation</Text>
                                         </View>
                                    ) : (
                                         <View style={styles.safetyNormal}>
                                             <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                                             <Text style={styles.normalText}>Normal</Text>
                                         </View>
                                    )}
                                </View>
                            </View>

                            {/* Footer Actions */}
                            <View style={styles.footer}>
                                <View style={styles.gpsStatus}>
                                    <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                                    <Text style={styles.gpsText}>{status.gps ? "Tracking Active" : "No GPS"}</Text>
                                </View>
                                <TouchableOpacity 
                                    style={styles.detailsLink}
                                    onPress={() => router.push({ pathname: "/(passenger)/prediction", params: { routeId: bus.routeId, busId: bus.id || bus._id } })}
                                >
                                    <Text style={styles.linkText}>View Prediction</Text>
                                    <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
                                </TouchableOpacity>
                            </View>
                        </Card>
                    );
                })
            )}
            <View style={{ height: 20 }} />
            
            <Button 
                variant="outline"
                onPress={() => router.push("/(passenger)/physics")}
                style={{ marginTop: 10 }}
            >
                Enter Simulation Mode
            </Button>
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: 16,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: "bold",
        color: Colors.text,
    },
    pageSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    countBadge: {
        backgroundColor: Colors.iconBackground,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    countText: {
        color: Colors.primary,
        fontWeight: "600",
        fontSize: 12,
    },
    loadingText: {
        textAlign: "center",
        marginTop: 40,
        color: Colors.textSecondary,
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        backgroundColor: Colors.white,
        borderRadius: 16,
    },
    emptyText: {
        marginTop: 12,
        color: Colors.textSecondary,
    },
    busCard: {
        padding: 0, // Reset padding
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: "#f8fafc", // slate-50
    },
    busIdentity: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    licensePlate: {
        fontSize: 16,
        fontWeight: "bold",
        color: Colors.text,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    routeText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
    },
    section: {
        padding: 16,
    },
    occupancyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    labelText: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: "500",
    },
    occupancyValue: {
        fontSize: 12,
        fontWeight: "600",
    },
    progressBarBg: {
        height: 8,
        backgroundColor: Colors.border,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    grid: {
        flexDirection: 'row',
        gap: 16,
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    gridItem: {
        flex: 1,
        padding: 12,
        backgroundColor: "#f8fafc",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
        marginTop: 4,
    },
    bigValue: {
        fontSize: 20,
        fontWeight: "bold",
        color: Colors.text,
    },
    unit: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: "500",
    },
    safetyViolation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 6,
    },
    violationText: {
        color: Colors.error,
        fontWeight: "600",
        fontSize: 13,
    },
    safetyNormal: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 6,
    },
    normalText: {
        color: Colors.success,
        fontWeight: "600",
        fontSize: 13,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: Colors.border, // Dashed border not natively supported easily without lib, using solid
        borderStyle: Platform.select({ ios: 'solid', android: 'dashed' }) as any, 
    },
    gpsStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    gpsText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    detailsLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    linkText: {
        fontSize: 12,
        fontWeight: "600",
        color: Colors.primary,
    }
});
