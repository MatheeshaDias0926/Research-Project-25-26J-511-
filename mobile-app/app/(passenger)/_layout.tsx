import { Stack, Redirect } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { View, Text } from "react-native";
import { Colors } from "../../constants/Colors";

export default function PassengerLayout() {
    const { authState } = useAuth();

    if (authState.authenticated === null) {
        return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
    }

    if (!authState.authenticated) {
        return <Redirect href="/login" />;
    }

    if (authState.user?.role !== "passenger") {
        // Redirect back to their correct dashboard if they drift here
        // The AuthContext effect should handle this, but double safety is good
        return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
    }

    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: Colors.card },
                headerTitleStyle: { color: Colors.text, fontWeight: "600" },
                headerShadowVisible: false,
                contentStyle: { backgroundColor: Colors.background }
            }}
        >
            <Stack.Screen name="home" options={{ title: "Passenger Dashboard" }} />
            <Stack.Screen name="prediction" options={{ title: "Arrival Prediction" }} />
            <Stack.Screen name="physics" options={{ title: "Physics Data Check" }} />
        </Stack>
    );
}
