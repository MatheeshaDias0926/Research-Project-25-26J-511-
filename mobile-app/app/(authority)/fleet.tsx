import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { busApi } from "../../src/api/bus";
import { Card } from "../../src/components/ui/Card";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function FleetManagementScreen() {
    const [buses, setBuses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchBuses = async () => {
        try {
            const data = await busApi.getAll();
            setBuses(data);
        } catch (error) {
            console.error("Failed to load buses");
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
        <View style={styles.container}>
            <FlatList
                data={buses}
                keyExtractor={(item) => item.id || item._id}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                renderItem={({ item }) => (
                    <Card style={styles.card}>
                        <View style={styles.iconBox}>
                            <Ionicons name="bus" size={24} color={Colors.iconColor} />
                        </View>
                        <View style={styles.info}>
                            <Text style={styles.busNumber}>{item.busNumber}</Text>
                            <Text style={styles.route}>{item.routeNumber} - {item.route}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: item.status === 'Active' ? Colors.successBg : Colors.inputBackground }]}>
                            <Text style={[styles.statusText, { color: item.status === 'Active' ? Colors.success : Colors.textSecondary }]}>
                                {item.status || "Inactive"}
                            </Text>
                        </View>
                    </Card>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    list: {
        padding: 16,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        padding: 16,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.iconBackground,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    info: {
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
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
    }
});
