import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
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
    
    // Header Right: Logout button
    React.useLayoutEffect(() => {
         navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity onPress={logout}>
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
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchBuses();
    };

    return (
        <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <Text style={styles.sectionTitle}>Active Buses</Text>
                <Text style={styles.sectionSubtitle}>Select a bus to view details</Text>
            </View>

            {loading && !refreshing ? (
                <Text style={styles.loadingText}>Loading buses...</Text>
            ) : buses.length === 0 ? (
                <Card style={styles.emptyCard}>
                    <Ionicons name="bus-outline" size={48} color={Colors.textSecondary} />
                    <Text style={styles.emptyText}>No active buses found.</Text>
                </Card>
            ) : (
                buses.map((bus) => (
                    <Card key={bus.id || bus._id} style={styles.busCard}>
                        <View style={styles.busHeader}>
                            <View style={styles.busIcon}>
                                <Ionicons name="bus" size={24} color={Colors.iconColor} />
                            </View>
                            <View style={styles.busInfo}>
                                <Text style={styles.busNumber}>{bus.busNumber}</Text>
                                <Text style={styles.route}>{bus.routeNumber} ({bus.route})</Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: bus.status === 'Active' ? Colors.successBg : Colors.errorBg }]}>
                                <Text style={[styles.statusText, { color: bus.status === 'Active' ? Colors.success : Colors.error }]}>
                                    {bus.status || 'Active'}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={styles.actions}>
                            <Button 
                                variant="outline" 
                                style={styles.actionButton}
                                onPress={() => router.push({ pathname: "/(passenger)/prediction", params: { routeId: bus.routeNumber, busId: bus.id || bus._id } })}
                            >
                                <Ionicons name="time-outline" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
                                Prediction
                            </Button>
                            
                            <Button 
                                variant="outline" 
                                style={styles.actionButton}
                                onPress={() => router.push({ pathname: "/(passenger)/physics", params: { busId: bus.id || bus._id } })}
                            >
                                <Ionicons name="pulse-outline" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
                                Physics
                            </Button>
                        </View>
                    </Card>
                ))
            )}
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
    header: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: Colors.text,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    loadingText: {
        textAlign: "center",
        marginTop: 40,
        color: Colors.textSecondary,
    },
    emptyCard: {
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
    },
    emptyText: {
        marginTop: 12,
        color: Colors.textSecondary,
    },
    busCard: {
        marginBottom: 16,
    },
    busHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    busIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.iconBackground,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    busInfo: {
        flex: 1,
    },
    busNumber: {
        fontSize: 16,
        fontWeight: "bold",
        color: Colors.text,
    },
    route: {
        fontSize: 14,
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
    actions: {
        flexDirection: "row",
        gap: 12,
    },
    actionButton: {
        flex: 1,
    }
});
