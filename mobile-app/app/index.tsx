import { Redirect } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
    const { authState } = useAuth();

    // Show loading indicator while checking auth state
    if (authState.authenticated === null) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!authState.authenticated) {
        return <Redirect href="/login" />;
    }

    // Redirect based on role
    const role = authState.user?.role;
    if (role === "conductor") return <Redirect href="/(conductor)/dashboard" />;
    if (role === "authority") return <Redirect href="/(authority)/dashboard" />;
    
    // Default to passenger
    return <Redirect href="/(passenger)/home" />;
}
