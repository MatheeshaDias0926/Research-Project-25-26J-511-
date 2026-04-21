import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { authApi } from "../../src/api/auth";
import { busApi } from "../../src/api/bus";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function AuthorityDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [violations, setViolations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    const fetchStats = async () => {
        try {
            const [statsData, busesData] = await Promise.all([
                authApi.getStats(),
                busApi.getAll()
            ]);
            
            setStats(statsData);
            // Get recent violations
            const recentViolations = busesData
                .flatMap((bus: any) => bus.violationlogs || [])
                .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 5);
            setViolations(recentViolations);
        } catch (error) {
            console.error("Failed to load stats");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    const StatCard = ({ icon, label, value, color, trend }: any) => (
        <Card style={[styles.statCard, { borderLeftWidth: 4, borderLeftColor: color }]}>
            <View style={styles.statCardContent}>
                <View style={styles.statLeft}>
                    <Text style={styles.statLabel}>{label}</Text>
                    <Text style={styles.statValue}>{value}</Text>
                    {trend && (
                        <Text style={[styles.statTrend, { color: trend.positive ? Colors.success : Colors.error }]}>
                            {trend.positive ? '↑' : '↓'} {trend.value}
                        </Text>
                    )}
                </View>
                <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
                    <Ionicons name={icon} size={28} color={color} />
                </View>
            </View>
        </Card>
    );

    return (
        <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            showsVerticalScrollIndicator={false}
        >
            {/* Header with gradient */}
            <LinearGradient colors={[Colors.primary, Colors.primary + 'CC']} style={styles.headerGradient}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Fleet Control</Text>
                    <Text style={styles.headerSubtitle}>Real-time system monitoring</Text>
                </View>
                <View style={styles.headerStats}>
                    <View style={styles.headerStatItem}>
                        <Text style={styles.headerStatValue}>{stats?.activeBuses || 0}</Text>
                        <Text style={styles.headerStatLabel}>Active</Text>
                    </View>
                    <View style={styles.headerStatItem}>
                        <Text style={styles.headerStatValue}>{stats?.totalBuses || 0}</Text>
                        <Text style={styles.headerStatLabel}>Total</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Key Metrics */}
            <Text style={styles.sectionTitle}>Key Metrics</Text>
            <View style={{ gap: 12 }}>
                <StatCard
                    icon="bus"
                    label="Active Buses"
                    value={stats?.activeBuses || 0}
                    color={Colors.primary}
                    trend={{ positive: true, value: '2' }}
                />
                <StatCard
                    icon="warning"
                    label="Active Violations"
                    value={stats?.totalViolations || 0}
                    color={Colors.error}
                    trend={{ positive: false, value: '1' }}
                />
                <StatCard
                    icon="build"
                    label="Pending Maintenance"
                    value={stats?.pendingMaintenance || 0}
                    color="#F59E0B"
                    trend={{ positive: true, value: '0' }}
                />
                <StatCard
                    icon="people"
                    label="Total Employees"
                    value={stats?.totalUsers || 0}
                    color="#8B5CF6"
                />
            </View>

            {/* Recent Violations */}
            {violations.length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>Recent Violations</Text>
                    <View style={{ gap: 12 }}>
                        {violations.slice(0, 3).map((violation, idx) => (
                            <Card key={idx} style={styles.violationCard}>
                                <View style={styles.violationContent}>
                                    <View style={[styles.violationIcon, { backgroundColor: Colors.error + '20' }]}>
                                        <Ionicons name="alert-circle" size={20} color={Colors.error} />
                                    </View>
                                    <View style={styles.violationInfo}>
                                        <Text style={styles.violationType}>{violation.type || 'Safety Violation'}</Text>
                                        <Text style={styles.violationTime}>
                                            {new Date(violation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                                </View>
                            </Card>
                        ))}
                    </View>
                </>
            )}

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionGrid}>
                <TouchableOpacity 
                    style={[styles.actionCard, { borderLeftColor: Colors.primary }]}
                    onPress={() => router.push("/(authority)/fleet")}
                >
                    <Ionicons name="list" size={24} color={Colors.primary} />
                    <Text style={styles.actionText}>Fleet</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.actionCard, { borderLeftColor: Colors.error }]}
                    onPress={() => router.push("/(authority)/violations")}
                >
                    <Ionicons name="warning" size={24} color={Colors.error} />
                    <Text style={styles.actionText}>Violations</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.actionCard, { borderLeftColor: '#F59E0B' }]}
                    onPress={() => router.push("/(authority)/maintenance")}
                >
                    <Ionicons name="build" size={24} color="#F59E0B" />
                    <Text style={styles.actionText}>Maintenance</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.actionCard, { borderLeftColor: '#8B5CF6' }]}
                    onPress={() => router.push("/(authority)/map")}
                >
                    <Ionicons name="map" size={24} color="#8B5CF6" />
                    <Text style={styles.actionText}>Live Map</Text>
                </TouchableOpacity>
            </View>

            <View style={{ height: 24 }} />
        </ScrollView>
    );

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: 16,
        paddingTop: 0,
    },
    headerGradient: {
        paddingHorizontal: 16,
        paddingVertical: 20,
        marginHorizontal: -16,
        marginBottom: 24,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    headerContent: {
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    headerStats: {
        flexDirection: 'row',
        gap: 24,
    },
    headerStatItem: {
        alignItems: 'center',
    },
    headerStatValue: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
    },
    headerStatLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 12,
        marginTop: 20,
    },
    statCard: {
        padding: 0,
        overflow: 'hidden',
    },
    statCardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    statLeft: {
        flex: 1,
    },
    statLabel: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 8,
    },
    statValue: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 6,
    },
    statTrend: {
        fontSize: 12,
        fontWeight: '600',
    },
    iconBox: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    violationCard: {
        padding: 0,
    },
    violationContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 12,
    },
    violationIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    violationInfo: {
        flex: 1,
    },
    violationType: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 2,
    },
    violationTime: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    actionCard: {
        width: '48%',
        paddingVertical: 16,
        paddingHorizontal: 12,
        backgroundColor: Colors.surface,
        borderRadius: 12,
        borderLeftWidth: 4,
        alignItems: 'center',
        gap: 8,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
});
