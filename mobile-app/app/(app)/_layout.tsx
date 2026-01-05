import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { Text, View } from "react-native";

export default function AppLayout() {
    const { authState } = useAuth();

    // Show loading while checking auth
    if (authState.authenticated === null) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <Text>Loading Session...</Text>
            </View>
        );
    }

    // Redirect to login if not authenticated
    if (!authState.authenticated) {
        return <Redirect href="/login" />;
    }

    return (
        <Stack>
            <Stack.Screen name="dashboard" options={{ title: "Driver Dashboard", headerShown: false }} />
            <Stack.Screen name="bus-selection" options={{ title: "Select Bus", headerShown: false }} />
            <Stack.Screen name="maintenance" options={{ title: "Report Maintenance", presentation: 'modal' }} />
        </Stack>
    );
}
