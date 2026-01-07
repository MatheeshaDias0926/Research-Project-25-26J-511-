import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useAuth } from "../src/context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "../src/components/ui/Input";
import { Button } from "../src/components/ui/Button";
import { Card } from "../src/components/ui/Card";
import { Colors } from "../constants/Colors";
import { Link, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

export default function RegisterScreen() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const { register } = useAuth();
    const router = useRouter();

    const handleRegister = async () => {
        if (!username || !password || !confirmPassword) {
            setError("Please fill in all fields");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsLoading(true);
        setError("");
        try {
            await register(username, password); // Defaults to passenger
            // AuthContext will handle login and redirect
        } catch (err: any) {
            setError(err.response?.data?.message || "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.content}>
                        <Card style={styles.card}>
                            <View style={styles.header}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name="person-add" size={32} color={Colors.iconColor} />
                                </View>
                                <Text style={styles.title}>Create Account</Text>
                                <Text style={styles.subtitle}>Sign up as a Passenger</Text>
                            </View>

                            <View style={styles.form}>
                                {error ? (
                                    <View style={styles.errorContainer}>
                                        <Text style={styles.errorText}>{error}</Text>
                                    </View>
                                ) : null}

                                <Input
                                    label="Username"
                                    placeholder="Choose a username"
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                />

                                <Input
                                    label="Password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />

                                <Input
                                    label="Confirm Password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                />

                                <Button 
                                    onPress={handleRegister} 
                                    isLoading={isLoading} 
                                    style={styles.button}
                                >
                                    Sign Up
                                </Button>

                                <View style={styles.footer}>
                                    <Text style={styles.footerText}>Already have an account? </Text>
                                    <Link href="/login" asChild>
                                        <Text style={styles.link}>Sign In</Text>
                                    </Link>
                                </View>
                            </View>
                        </Card>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
        padding: 20,
    },
    content: {
        width: "100%",
        maxWidth: 400,
        alignSelf: "center",
    },
    card: {
        borderRadius: 16,
    },
    header: {
        alignItems: "center",
        marginBottom: 24,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.iconBackground,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: Colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    form: {
        width: "100%",
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
    button: {
        marginTop: 8,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 24,
    },
    footerText: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    link: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.primary,
    },
});
