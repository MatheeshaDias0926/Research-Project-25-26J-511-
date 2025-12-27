import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { maintenanceApi } from "../../src/api/maintenance";
import { Card } from "../../src/components/ui/Card";
import { Input } from "../../src/components/ui/Input";
import { Button } from "../../src/components/ui/Button";
import { Colors } from "../../constants/Colors";
import * as SecureStore from "expo-secure-store";

export default function MaintenanceReportScreen() {
    const router = useRouter();
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        const busId = await SecureStore.getItemAsync("currentBusId");
        
        if (!subject || !description) {
            setError("Subject and description are required");
            return;
        }

        if (!busId) {
            setError("No bus selected. Please select a bus first.");
            return;
        }

        setLoading(true);
        try {
            await maintenanceApi.create({
                busId,
                subject,
                description,
                timestamp: new Date().toISOString(),
                status: "Pending"
            });
            router.back();
        } catch (err) {
            setError("Failed to submit report");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <Card>
                    <Text style={styles.title}>New Maintenance Issue</Text>
                    <Text style={styles.subtitle}>Report a mechanical or safety issue for your bus.</Text>

                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    <Input
                        label="Subject"
                        placeholder="e.g. Engine Overheating"
                        value={subject}
                        onChangeText={setSubject}
                    />

                    <Input
                        label="Description"
                        placeholder="Provide detailed information..."
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        style={{ height: 100, textAlignVertical: 'top' }}
                    />

                    <Button 
                        onPress={handleSubmit} 
                        isLoading={loading}
                        style={{ marginTop: 12 }}
                    >
                        Submit Report
                    </Button>
                </Card>
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
        padding: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: Colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 24,
    },
    error: {
        color: Colors.error,
        marginBottom: 16,
    }
});
