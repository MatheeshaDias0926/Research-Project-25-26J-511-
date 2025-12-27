import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Platform, Alert } from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import { busApi } from "../../src/api/bus";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import * as Haptics from "expo-haptics";

export default function ConductorDashboard() {
    const [busId, setBusId] = useState<string | null>(null);
    const [myBus, setMyBus] = useState<any>(null);
    const [violations, setViolations] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [locationName, setLocationName] = useState<string>("Unknown Location");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    
    // Track the latest violation ID to detect new ones
    const latestViolationIdRef = useRef<string | null>(null);
    const isFirstLoad = useRef(true);

    const router = useRouter();

    useEffect(() => {
        const checkBusSelection = async () => {
            const id = await SecureStore.getItemAsync("currentBusId");
            
            if (!id) {
                router.replace("/(conductor)/bus-selection");
            } else {
                setBusId(id);
                fetchData(id);
            }
        };
        checkBusSelection();
        
        // Auto refresh every 10s for faster alerts
        const interval = setInterval(() => {
            if (busId) fetchData(busId);
        }, 10000);
        
        return () => clearInterval(interval);
    }, [busId]);

    const fetchData = async (id: string) => {
        try {
            // 1. Fetch Status & Bus Details
            const statusRes : any = await busApi.getStatus(id);
            const busData = {
                ...statusRes.bus,
                currentStatus: statusRes.currentStatus
            };
            setMyBus(busData);

            // 2. Reverse Geocode
            if (busData.currentStatus?.gps) {
                const { lat, lon } = busData.currentStatus.gps;
                try {
                    // Use a direct axios call for external API
                    const geoRes = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
                        headers: { 'User-Agent': 'SmartBusApp/1.0' } // Nominatim requires User-Agent
                    });
                    const address = geoRes.data.address;
                    const city = address.city || address.town || address.village || address.suburb || "Unknown Location";
                    setLocationName(city);
                } catch (geoError) {
                   // Fail silently for geo
                }
            }

            // 3. Fetch Violations
            const violationsRes : any = await busApi.getViolations(id, 5);
            let currentViolations = [];
            
            if (violationsRes && Array.isArray(violationsRes.violations)) {
                 currentViolations = violationsRes.violations;
                 setViolations(currentViolations);

                 // Check for new violations
                 if (currentViolations.length > 0) {
                     const newestViolation = currentViolations[0];
                     
                     // If we have a new violation that is different from the last one we saw
                     if (latestViolationIdRef.current !== newestViolation._id) {
                         
                         // Skip alert on the very first load to avoid spamming upon login
                         if (!isFirstLoad.current) {
                             triggerViolationAlert(newestViolation);
                         }
                         
                         latestViolationIdRef.current = newestViolation._id;
                     }
                 }
            } else {
                 setViolations([]);
            }
            
            isFirstLoad.current = false;

            // 4. Fetch Logs (for History Trend)
            const logsRes : any = await busApi.getLogs(id, 10);
            if (logsRes && Array.isArray(logsRes.logs)) {
                setLogs(logsRes.logs);
            }

            setLastUpdated(new Date());

        } catch (error) {
            console.error("Dashboard fetch error", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const triggerViolationAlert = async (violation: any) => {
        // Haptic feedback for immediate attention
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        Alert.alert(
            "⚠️ CRITICAL VIOLATION DETECTED",
            `${violation.violationType?.toUpperCase() || "UNKNOWN"} violation detected!\n\nLocation: ${locationName}\nTime: ${new Date(violation.timestamp || violation.createdAt).toLocaleTimeString()}`,
            [
                { text: "Acknowledge", style: "cancel" },
                { text: "View Details", onPress: () => { /* scroll to logs or open details */ } }
            ]
        );
    };

    const onRefresh = () => {
        if (busId) {
            setRefreshing(true);
            fetchData(busId);
        }
    };

    if (loading && !myBus) {
        return (
             <View style={[styles.container, styles.center]}>
                <Text style={{ color: Colors.textSecondary }}>Loading Dashboard...</Text>
             </View>
        );
    }

    return (
        <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* Header / Title */}
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.pageTitle}>My Bus Dashboard</Text>
                    <Text style={styles.pageSubtitle}>Real-time overview</Text>
                </View>
                <View style={styles.headerActions}>
                     <Button 
                         variant="outline" 
                         onPress={() => router.replace("/(conductor)/bus-selection")}
                         style={styles.smallBtn}
                     >
                         <Ionicons name="bus-outline" size={16} color={Colors.primary} />
                     </Button>
                     <Button 
                         variant="outline"
                         onPress={onRefresh}
                         style={styles.smallBtn}
                     >
                         <Ionicons name="refresh" size={16} color={Colors.primary} />
                     </Button>
                </View>
            </View>

            {/* Main Bus Card (Dark Theme like Frontend) */}
            <Card style={styles.mainCard}>
                <View style={styles.mainCardContent}>
                    <View style={styles.busIdentity}>
                         <View style={styles.busIconContainer}>
                             <Ionicons name="bus" size={32} color="#fff" />
                         </View>
                         <View>
                             <Text style={styles.licensePlate}>
                                 {myBus?.licensePlate || myBus?.busNumber || "Unknown"}
                             </Text>
                             <View style={styles.locationContainer}>
                                 <Ionicons name="location-sharp" size={14} color="#94a3b8" />
                                 <Text style={styles.locationText}>{locationName}</Text>
                             </View>
                             <Text style={styles.routeText}>Route {myBus?.routeId || myBus?.routeNumber}</Text>
                         </View>
                    </View>
                    
                    <View style={styles.statusContainer}>
                        <View style={styles.statusBadgeContainer}>
                             <Text style={styles.statusLabel}>Status</Text>
                             <View style={[styles.badge, myBus?.currentStatus ? styles.badgeSuccess : styles.badgeInactive]}>
                                 <Text style={[styles.badgeText, myBus?.currentStatus ? styles.textSuccess : styles.textInactive]}>
                                     {myBus?.currentStatus ? "Active" : "Inactive"}
                                 </Text>
                             </View>
                        </View>
                        <View style={styles.capacityContainer}>
                             <Text style={styles.statusLabel}>Capacity</Text>
                             <Text style={styles.capacityValue}>{myBus?.capacity || 55}</Text>
                        </View>
                    </View>
                </View>
            </Card>

            {/* Quick Stats Grid */}
            <View style={styles.grid}>
                <Card style={styles.statCard}>
                    <Ionicons name="speedometer" size={24} color={Colors.primary} />
                    <Text style={styles.statValue}>{myBus?.currentStatus?.speed || 0} km/h</Text>
                    <Text style={styles.statLabel}>Current Speed</Text>
                </Card>
                <Card style={styles.statCard}>
                    <Ionicons name="people" size={24} color={Colors.success} />
                    <Text style={styles.statValue}>{myBus?.currentStatus?.currentOccupancy || 0}</Text>
                    <Text style={styles.statLabel}>Passengers</Text>
                </Card>
            </View>

            {/* Recent Violations */}
            <Card style={styles.sectionCard}>
                <View style={styles.cardHeader}>
                    <Ionicons name="alert-circle" size={20} color={Colors.warning} />
                    <Text style={styles.cardTitle}>Recent Alerts</Text>
                </View>

                {(!violations || violations.length === 0) ? (
                    <View style={styles.emptyState}>
                         <View style={styles.dotSuccess} />
                         <Text style={styles.emptyStateText}>No active violations or alerts.</Text>
                    </View>
                ) : (
                    violations.map((v, index) => (
                        <View key={index} style={styles.violationItem}>
                             <View style={styles.violationHeader}>
                                 <Text style={styles.violationType}>{v.violationType || v.type}</Text>
                                 <Text style={styles.violationTime}>{new Date(v.createdAt || v.timestamp).toLocaleTimeString()}</Text>
                             </View>
                             <Text style={styles.violationDetail}>
                                 Speed: {v.speed || 0} km/h • Loc: {v.gps?.lat?.toFixed(4)}, {v.gps?.lon?.toFixed(4)}
                             </Text>
                        </View>
                    ))
                )}
            </Card>

            {/* Historical Logs List (Replacing Chart for Mobile) */}
            <Card style={styles.sectionCard}>
                <View style={styles.cardHeader}>
                    <Ionicons name="time" size={20} color={Colors.primary} />
                    <Text style={styles.cardTitle}>Recent Activity Log</Text>
                </View>
                
                {logs.length === 0 ? (
                    <Text style={styles.emptyText}>No logs available.</Text>
                ) : (
                    logs.slice(0, 5).map((log, index) => (
                         <View key={index} style={styles.logItem}>
                             <Text style={styles.logTime}>
                                 {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </Text>
                             <View style={styles.logStats}>
                                  <Text style={styles.logStatText}>Occ: {log.currentOccupancy}</Text>
                                  <Text style={styles.logStatText}>Spd: {log.speed} km/h</Text>
                             </View>
                         </View>
                    ))
                )}
            </Card>

            <View style={styles.footerInfo}>
                 <Text style={styles.lastUpdated}>Updated: {lastUpdated.toLocaleTimeString()}</Text>
            </View>

            <Button 
                style={styles.maintenanceButton}
                onPress={() => router.push("/(conductor)/maintenance")}
            >
                Report Maintenance Issue
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
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 16,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: Colors.text,
    },
    pageSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    smallBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        height: 40,
        minWidth: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    /* Main Dark Card */
    mainCard: {
        backgroundColor: "#0f172a", // Dark Blue/Slate
        padding: 0, // Reset padding for custom layout
        overflow: 'hidden',
        marginBottom: 24,
        borderWidth: 0,
    },
    mainCardContent: {
        padding: 20,
    },
    busIdentity: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24, 
    },
    busIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "rgba(255,255,255,0.1)",
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    licensePlate: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 4,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    locationText: {
        fontSize: 16,
        color: "#94a3b8",
    },
    routeText: {
        fontSize: 16,
        color: "#94a3b8",
    },
    statusContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusBadgeContainer: {
        alignItems: 'flex-start',
    },
    capacityContainer: {
        alignItems: 'center',
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    statusLabel: {
        fontSize: 12,
        color: "#94a3b8",
        marginBottom: 4,
    },
    capacityValue: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#fff",
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    badgeSuccess: {
        backgroundColor: "rgba(34, 197, 94, 0.2)",
    },
    badgeInactive: {
        backgroundColor: "rgba(148, 163, 184, 0.2)",
    },
    badgeText: {
        fontSize: 14,
        fontWeight: "600",
    },
    textSuccess: {
        color: "#4ade80",
    },
    textInactive: {
        color: "#cbd5e1",
    },
    /* Grid Stats */
    grid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        padding: 16,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: Colors.text,
        marginVertical: 4,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    /* Section Cards */
    sectionCard: {
        marginBottom: 16,
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.text,
    },
    /* Violations */
    emptyState: {
        backgroundColor: "#f0fdf4",
        padding: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dotSuccess: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#22c55e",
    },
    emptyStateText: {
        color: "#15803d",
        fontWeight: "500",
        fontSize: 14,
    },
    violationItem: {
        backgroundColor: "#fef2f2",
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#fee2e2",
        marginBottom: 8,
    },
    violationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    violationType: {
        color: "#dc2626",
        fontWeight: "600",
        fontSize: 14,
    },
    violationTime: {
        fontSize: 12,
        color: "#94a3b8",
    },
    violationDetail: {
        fontSize: 12,
        color: "#64748b",
    },
    maintenanceButton: {
        backgroundColor: "#0f172a", // Dark styling for action button
        marginTop: 8,
    },
    /* Logs */
    logItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    logTime: {
        color: Colors.text,
        fontWeight: "500",
    },
    logStats: {
        flexDirection: 'row',
        gap: 12,
    },
    logStatText: {
        color: Colors.textSecondary,
        fontSize: 12,
    },
    emptyText: {
        color: Colors.textSecondary,
        fontStyle: 'italic',
    },
    footerInfo: {
        marginTop: 16,
        alignItems: 'center',
    },
    lastUpdated: {
        color: Colors.textSecondary,
        fontSize: 12,
    }
});
