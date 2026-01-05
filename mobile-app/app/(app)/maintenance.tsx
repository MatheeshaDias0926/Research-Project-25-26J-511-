import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { createMaintenanceReport } from "../../src/api/maintenance";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const ISSUES = [
    "Engine Trouble",
    "Brake Issue",
    "Tire Flat/Low Pressure",
    "Door Malfunction",
    "AC/Ventilation",
    "Other"
];

export default function MaintenanceScreen() {
    const { busId } = useLocalSearchParams();
    const [selectedIssue, setSelectedIssue] = useState(ISSUES[0]);
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("medium");

    const mutation = useMutation({
        mutationFn: createMaintenanceReport,
        onSuccess: () => {
            Alert.alert("Success", "Maintenance report submitted successfully");
            router.back();
        },
        onError: (error) => {
            Alert.alert("Error", error.response?.data?.message || "Failed to submit report");
        },
    });

    const handleSubmit = () => {
        if (!description.trim()) {
            Alert.alert("Validation", "Please provide a brief description");
            return;
        }

        mutation.mutate({
            busId,
            issue: selectedIssue,
            description,
            priority,
        });
    };

    return (
        <SafeAreaView style={styles.container} edges={["bottom"]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Report Maintenance</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Select Issue Type</Text>
                <View style={styles.chipContainer}>
                    {ISSUES.map((issue) => (
                        <TouchableOpacity
                            key={issue}
                            style={[styles.chip, selectedIssue === issue && styles.chipSelected]}
                            onPress={() => setSelectedIssue(issue)}
                        >
                            <Text style={[styles.chipText, selectedIssue === issue && styles.chipTextSelected]}>
                                {issue}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Priority Level</Text>
                <View style={styles.priorityContainer}>
                    {["low", "medium", "high"].map((p) => (
                        <TouchableOpacity
                            key={p}
                            style={[
                                styles.priorityBtn,
                                priority === p && styles[`priority${p.charAt(0).toUpperCase() + p.slice(1)}`]
                            ]}
                            onPress={() => setPriority(p)}
                        >
                            <Text style={[styles.priorityText, priority === p && { color: "#fff" }]}>
                                {p.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Description</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="Describe the problem in detail..."
                    multiline
                    numberOfLines={4}
                    value={description}
                    onChangeText={setDescription}
                    textAlignVertical="top"
                />

                <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleSubmit}
                    disabled={mutation.isPending}
                >
                    {mutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitBtnText}>Submit Report</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        padding: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
    },
    closeBtn: {
        padding: 4,
    },
    form: {
        padding: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        color: "#334155",
        marginBottom: 12,
        marginTop: 8,
    },
    chipContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 24,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#f1f5f9",
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    chipSelected: {
        backgroundColor: "#2563eb",
        borderColor: "#2563eb",
    },
    chipText: {
        color: "#64748b",
    },
    chipTextSelected: {
        color: "#fff",
        fontWeight: "600",
    },
    priorityContainer: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 24,
    },
    priorityBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        backgroundColor: "#f1f5f9",
        alignItems: "center",
    },
    priorityLow: { backgroundColor: "#22c55e" },
    priorityMedium: { backgroundColor: "#f59e0b" },
    priorityHigh: { backgroundColor: "#ef4444" },
    priorityText: {
        fontWeight: "bold",
        fontSize: 12,
        color: "#64748b",
    },
    textArea: {
        backgroundColor: "#f8fafc",
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        height: 120,
        marginBottom: 24,
    },
    submitBtn: {
        backgroundColor: "#0f172a",
        padding: 18,
        borderRadius: 12,
        alignItems: "center",
    },
    submitBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
});
