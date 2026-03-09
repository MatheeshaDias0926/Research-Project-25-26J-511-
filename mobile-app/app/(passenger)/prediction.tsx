import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { busApi } from "../../src/api/bus";
import { Card } from "../../src/components/ui/Card";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function PredictionScreen() {
    const { routeId, busId } = useLocalSearchParams();
    const [prediction, setPrediction] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPrediction = async () => {
            const routeIdStr = Array.isArray(routeId) ? routeId[0] : routeId;
            if (!routeIdStr) return;
            try {
                const data = await busApi.getPrediction(routeIdStr);
                setPrediction(data);
            } catch (error) {
                console.error("Error fetching prediction", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPrediction();
    }, [routeId]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Card style={styles.card}>
                <View style={styles.iconContainer}>
                    <Ionicons name="time" size={40} color={Colors.iconColor} />
                </View>
                <Text style={styles.title}>Arrival Prediction</Text>
                
                {prediction ? (
                    <View style={styles.content}>
                        <Text style={styles.estimateLabel}>Estimated Arrival Time</Text>
                        <Text style={styles.time}>{prediction.arrivalTime || "15 mins"}</Text> 
                        {/* Fallback mock data if API returns structure different than expected or is not ready */}
                        
                        <View style={styles.divider} />
                        
                        <View style={styles.row}>
                            <Text style={styles.label}>Crowd Level</Text>
                            <Text style={styles.value}>{prediction.crowdLevel || "Medium"}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Traffic Condition</Text>
                            <Text style={styles.value}>{prediction.traffic || "Normal"}</Text>
                        </View>
                    </View>
                ) : (
                    <Text style={styles.error}>No prediction data available for this route.</Text>
                )}
            </Card>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        padding: 20,
        justifyContent: 'center',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    card: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.iconBackground,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: Colors.text,
        marginBottom: 24,
    },
    content: {
        width: '100%',
        alignItems: 'center',
    },
    estimateLabel: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginBottom: 8,
    },
    time: {
        fontSize: 48,
        fontWeight: "800",
        color: Colors.primary,
        marginBottom: 24,
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: Colors.border,
        marginBottom: 24,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 12,
    },
    label: {
        fontSize: 16,
        color: Colors.textSecondary,
    },
    value: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.text,
    },
    error: {
        color: Colors.error,
        marginTop: 12,
    }
});
