import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { busApi } from "../../src/api/bus";
import { Card } from "../../src/components/ui/Card";
import { Input } from "../../src/components/ui/Input";
import { Button } from "../../src/components/ui/Button";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function PhysicsCheckScreen() {
    const { busId } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    
    // Form state
    const [speed, setSpeed] = useState("");
    const [passengerCount, setPassengerCount] = useState("");
    const [temperature, setTemperature] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!speed || !passengerCount) {
            setError("Speed and Passenger Count are required");
            return;
        }

        setLoading(true);
        setError("");
        
        try {
            await busApi.submitPhysicsCheck({
                busId,
                speed: parseFloat(speed),
                passengers: parseInt(passengerCount),
                temperature: parseFloat(temperature) || 25,
                timestamp: new Date().toISOString()
            });
            setSuccess(true);
            setTimeout(() => {
                router.back();
            }, 1500);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to submit data");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <View style={styles.center}>
                <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
                <Text style={styles.successText}>Data Submitted Successfully!</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Card>
                <View style={styles.header}>
                    <Ionicons name="speedometer-outline" size={32} color={Colors.primary} />
                    <Text style={styles.title}>Physics Data Check</Text>
                </View>
                <Text style={styles.description}>
                    Simulate sending IoT sensor data for Bus ID: {busId?.toString().slice(-6)}
                </Text>

                {error ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                <Input
                    label="Current Speed (km/h)"
                    placeholder="e.g. 60"
                    keyboardType="numeric"
                    value={speed}
                    onChangeText={setSpeed}
                />

                <Input
                    label="Passenger Count"
                    placeholder="e.g. 45"
                    keyboardType="numeric"
                    value={passengerCount}
                    onChangeText={setPassengerCount}
                />

                <Input
                    label="Internal Temperature (°C)"
                    placeholder="e.g. 26.5"
                    keyboardType="numeric"
                    value={temperature}
                    onChangeText={setTemperature}
                />

                <Button 
                    onPress={handleSubmit} 
                    isLoading={loading}
                    style={{ marginTop: 12 }}
                >
                    Submit Data
                </Button>
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: 20,
    },
    center: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: Colors.text,
    },
    description: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 24,
    },
    errorContainer: {
        backgroundColor: Colors.errorBg,
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    errorText: {
        color: Colors.error,
        fontSize: 14,
    },
    successText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: "bold",
        color: Colors.success,
    }
});
