import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { authApi } from "../../src/api/auth";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function AuthorityDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    const fetchStats = async () => {
        try {
            const data = await authApi.getStats();
            setStats(data);
        } catch (error) {
            console.error("Failed to load stats");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    return (
        <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <Text style={styles.welcomeText}>System Overview</Text>
            </View>

            <View style={styles.grid}>
                <Card style={styles.statCard}>
                    <View style={[styles.iconBox, { backgroundColor: Colors.iconBackground }]}>
                        <Ionicons name="bus" size={24} color={Colors.primary} />
                    </View>
                    <Text style={styles.statValue}>{stats?.totalBuses || 0}</Text>
                    <Text style={styles.statLabel}>Total Buses</Text>
                </Card>

                <Card style={styles.statCard}>
                    <View style={[styles.iconBox, { backgroundColor: Colors.successBg }]}>
                        <Ionicons name="power" size={24} color={Colors.success} />
                    </View>
                    <Text style={styles.statValue}>{stats?.activeBuses || 0}</Text>
                    <Text style={styles.statLabel}>Active Now</Text>
                </Card>

                <Card style={styles.statCard}>
                    <View style={[styles.iconBox, { backgroundColor: Colors.errorBg }]}>
                        <Ionicons name="warning" size={24} color={Colors.error} />
                    </View>
                    <Text style={styles.statValue}>{stats?.totalViolations || 0}</Text>
                    <Text style={styles.statLabel}>Violations</Text>
                </Card>

                <Card style={styles.statCard}>
                    <View style={[styles.iconBox, { backgroundColor: "#f3e8ff" }]}>
                        <Ionicons name="people" size={24} color="#9333ea" />
                    </View>
                    <Text style={styles.statValue}>{stats?.totalUsers || 0}</Text>
                    <Text style={styles.statLabel}>Total Users</Text>
                </Card>
            </View>

            <View style={styles.actions}>
                <Button 
                    variant="outline"
                    onPress={() => router.push("/(authority)/fleet")}
                    style={styles.actionButton}
                >
                    <Ionicons name="list" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
                    Manage Fleet
                </Button>
            </View>
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
    welcomeText: {
        fontSize: 24,
        fontWeight: "bold",
        color: Colors.text,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        width: '48%', // Approx half with gap
        padding: 16,
        marginBottom: 4,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: Colors.text,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    actions: {
        gap: 12,
    },
    actionButton: {
        justifyContent: 'flex-start',
    }
});
