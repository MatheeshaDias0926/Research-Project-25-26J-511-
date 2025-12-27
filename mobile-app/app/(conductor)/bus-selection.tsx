import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { busApi } from "../../src/api/bus";
import { Card } from "../../src/components/ui/Card";
import { Input } from "../../src/components/ui/Input";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

export default function BusSelectionScreen() {
    const [buses, setBuses] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const router = useRouter();

    useEffect(() => {
        const loadBuses = async () => {
            try {
                const data = await busApi.getAll();
                setBuses(data);
            } catch (error) {
                console.error("Failed to load buses", error);
            }
        };
        loadBuses();
    }, []);

    const handleSelectBus = async (bus: any) => {
        // Persist selection locally for this session
        if (bus.id || bus._id) {
            await SecureStore.setItemAsync("currentBusId", String(bus.id || bus._id));
        }
        if (bus.busNumber) {
            await SecureStore.setItemAsync("currentBusNumber", String(bus.busNumber));
        }
        
        router.replace("/(conductor)/dashboard");
    };

    const filteredBuses = buses.filter(b => 
        (b.busNumber?.toLowerCase() || "").includes(search.toLowerCase()) ||
        (b.routeNumber?.toLowerCase() || "").includes(search.toLowerCase())
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Input 
                    placeholder="Search bus number or route..." 
                    value={search} 
                    onChangeText={setSearch} 
                    style={{ marginBottom: 0 }}
                />
            </View>

            <FlatList
                data={filteredBuses}
                keyExtractor={(item) => item.id || item._id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => handleSelectBus(item)}>
                        <Card style={styles.card}>
                            <View style={styles.iconBox}>
                                <Ionicons name="bus" size={24} color={Colors.iconColor} />
                            </View>
                            <View style={styles.info}>
                                <Text style={styles.busNumber}>{item.busNumber}</Text>
                                <Text style={styles.route}>{item.routeNumber} - {item.route}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                        </Card>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        padding: 16,
        backgroundColor: Colors.card,
    },
    list: {
        padding: 16,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        padding: 16,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.iconBackground,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    info: {
        flex: 1,
    },
    busNumber: {
        fontSize: 16,
        fontWeight: "bold",
        color: Colors.text,
    },
    route: {
        fontSize: 14,
        color: Colors.textSecondary,
    }
});
