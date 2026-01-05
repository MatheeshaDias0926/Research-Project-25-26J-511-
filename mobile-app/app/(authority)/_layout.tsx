import { Tabs, Redirect } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { View, TouchableOpacity } from "react-native";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function AuthorityLayout() {
    const { authState, logout } = useAuth();

    if (authState.authenticated === null) return <View />;
    if (!authState.authenticated) return <Redirect href="/login" />;
    if (authState.user?.role !== "authority") return <View />;

    return (
        <Tabs
            screenOptions={{
                headerStyle: { backgroundColor: Colors.card },
                headerTitleStyle: { color: Colors.text, fontWeight: "600" },
                headerShadowVisible: false,
                tabBarStyle: { backgroundColor: Colors.card, borderTopColor: Colors.border },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textSecondary,
                sceneStyle: { backgroundColor: Colors.background },
                headerRight: () => (
                    <TouchableOpacity onPress={logout} style={{ marginRight: 16 }}>
                        <Ionicons name="log-out-outline" size={24} color={Colors.text} />
                    </TouchableOpacity>
                ),
            }}
        >
            <Tabs.Screen 
                name="dashboard" 
                options={{ 
                    title: "Overview",
                    tabBarLabel: "Dashboard",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="stats-chart" size={size} color={color} />
                    )
                }} 
            />
            <Tabs.Screen 
                name="fleet" 
                options={{ 
                    title: "Fleet Management",
                    tabBarLabel: "Fleet",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="bus" size={size} color={color} />
                    )
                }} 
            />
        </Tabs>
    );
}
