import { Stack, Redirect } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { View, TouchableOpacity } from "react-native";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function ConductorLayout() {
    const { authState, logout } = useAuth();

    if (authState.authenticated === null) return <View />;

    if (!authState.authenticated) return <Redirect href="/login" />;

    if (authState.user?.role !== "conductor") return <View />;

    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: Colors.card },
                headerTitleStyle: { color: Colors.text, fontWeight: "600" },
                headerTintColor: Colors.primary,
                headerShadowVisible: false,
                contentStyle: { backgroundColor: Colors.background },
                headerRight: () => (
                    <TouchableOpacity onPress={logout}>
                        <Ionicons name="log-out-outline" size={24} color={Colors.text} />
                    </TouchableOpacity>
                ),
            }}
        >
            <Stack.Screen name="dashboard" options={{ title: "Dashboard" }} />
            <Stack.Screen name="bus-selection" options={{ title: "Select Bus", headerLeft: () => null }} />
            <Stack.Screen name="maintenance" options={{ title: "Report Issue", headerBackTitle: "Dashboard" }} />
        </Stack>
    );
}
