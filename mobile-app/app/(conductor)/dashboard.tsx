import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  Alert,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import { busApi } from "../../src/api/bus";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { storage } from "../../src/utils/storage";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import {
  startGpsFeed,
  stopGpsFeed,
  isGpsFeedRunning,
} from "../../src/services/gps-feed";

export default function ConductorDashboard() {
  const [busId, setBusId] = useState<string | null>(null);
  const [myBus, setMyBus] = useState<any>(null);
  const [violations, setViolations] = useState<any[]>([]);

  // Restored State Variables
  const [logs, setLogs] = useState<any[]>([]);
  const [locationName, setLocationName] = useState<string>("Unknown Location");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Live Simulator Data

  // Live Simulator Data
  const [riskScore, setRiskScore] = useState(0);
  const isCriticalRef = useRef(false);

  // Track the latest violation ID to detect new ones
  const latestViolationIdRef = useRef<string | null>(null);
  const isFirstLoad = useRef(true);

  // GPS Feed State
  const [gpsFeedActive, setGpsFeedActive] = useState(false);
  const [gpsData, setGpsData] = useState<{
    lat: number;
    lon: number;
    speed: number;
  } | null>(null);

  const router = useRouter();

  useEffect(() => {
    const checkBusSelection = async () => {
      const id = await storage.getItem("currentBusId");
      const plate = await storage.getItem("currentBusPlate");

      if (!id) {
        router.replace("/(conductor)/bus-selection");
      } else {
        setBusId(id);
        fetchData(id);

        // Start GPS feed immediately using stored license plate
        if (plate && !gpsFeedActive) {
          console.log("[GPS Feed] Starting for plate:", plate);
          startGpsFeed(
            plate,
            (data) => {
              setGpsData({ lat: data.lat, lon: data.lon, speed: data.speed });
            },
            1000, // Every 1 second for smoother real-time tracked positioning
          ).then((result) => {
            if (result.success) {
              setGpsFeedActive(true);
              console.log("[GPS Feed] ✅ Active for", plate);
            } else {
              console.error("[GPS Feed] ❌ Failed:", result.error);
              Alert.alert(
                "GPS Permission Required",
                result.error || "Unable to access location.",
              );
            }
          });
        }
      }
    };
    checkBusSelection();

    // Polling for real-time data
    const interval = setInterval(() => {
      if (busId) fetchData(busId);
    }, 1000);

    return () => {
      clearInterval(interval);
      stopGpsFeed();
    };
  }, [busId]);

  const fetchData = async (id: string) => {
    try {
      // Fetch status, violations, and logs in parallel for faster updates
      const [statusRes, violationsRes, logsRes]: any[] = await Promise.all([
        busApi.getStatus(id),
        busApi.getViolations(id, 5),
        busApi.getLogs(id, 10),
      ]);

      // 1. Process Status & Bus Details
      const busData = {
        ...statusRes.bus,
        currentStatus: statusRes.currentStatus,
      };
      setMyBus(busData);

      if (busData.currentStatus) {
        // Check Risk Score (From Simulator)
        const currentRisk = busData.currentStatus.riskScore || 0;
        setRiskScore(currentRisk);

        // Audio Alert Logic
        if (currentRisk > 0.7) {
          if (!isCriticalRef.current) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Speech.speak("Critical Warning! Rollover Risk High! Slow Down!", {
              rate: 1.1,
              pitch: 1.2,
            });
            isCriticalRef.current = true;
          }
        } else if (currentRisk > 0.5) {
          if (!isCriticalRef.current) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            Speech.speak("Warning. Approaching unsafe speed.", { rate: 1.1 });
            isCriticalRef.current = true; // Debounce
          }
        } else {
          isCriticalRef.current = false; // Reset when safe
        }
      }

      // 2. Reverse Geocode (non-blocking, runs in background)
      if (busData.currentStatus?.gps) {
        const { lat, lon } = busData.currentStatus.gps;
        axios
          .get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
            {
              headers: { "User-Agent": "SmartBusApp/1.0" },
              timeout: 3000,
            },
          )
          .then((geoRes) => {
            const address = geoRes.data.address;
            const city =
              address.city ||
              address.town ||
              address.village ||
              address.suburb ||
              "Unknown Location";
            setLocationName(city);
          })
          .catch(() => {
            // Fail silently for geo
          });
      }

      // 3. Process Violations
      let currentViolations = [];

      if (violationsRes && Array.isArray(violationsRes.violations)) {
        currentViolations = violationsRes.violations;
        setViolations(currentViolations);

        // Track latest violation ID
        if (currentViolations.length > 0) {
          latestViolationIdRef.current = currentViolations[0]._id;
        }
      } else {
        setViolations([]);
      }

      isFirstLoad.current = false;

      // 4. Process Logs (for History Trend)
      if (logsRes && Array.isArray(logsRes.logs)) {
        setLogs(logsRes.logs);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Dashboard fetch error", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    if (busId) {
      setRefreshing(true);
      fetchData(busId);
    }
  };

  if (loading && !myBus) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: Colors.textSecondary }}>
          Loading Dashboard...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header / Title */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>My Bus Dashboard</Text>
          <Text style={styles.pageSubtitle}>Real-time overview</Text>
        </View>
        <View style={styles.headerActions}>
          <Button
            variant="outline"
            onPress={() => Linking.openURL("tel:911")}
            style={[
              styles.smallBtn,
              { borderColor: "#ef4444", backgroundColor: "#fef2f2" },
            ]}
          >
            <Ionicons name="call" size={16} color="#dc2626" />
          </Button>
          <Button
            variant="outline"
            onPress={() => router.replace("/(conductor)/bus-selection")}
            style={styles.smallBtn}
          >
            <Ionicons name="bus-outline" size={16} color={Colors.primary} />
          </Button>
          <Button variant="outline" onPress={onRefresh} style={styles.smallBtn}>
            <Ionicons name="refresh" size={16} color={Colors.primary} />
          </Button>
        </View>
      </View>

      {/* REAL-TIME SIMULATION ALERT OVERLAY */}
      {riskScore > 0.4 && (
        <Card
          style={{
            backgroundColor: riskScore > 0.7 ? "#ef4444" : "#f97316",
            marginBottom: 16,
            borderWidth: 0,
          }}
        >
          <View style={{ alignItems: "center", padding: 12 }}>
            <Ionicons name="warning" size={48} color="white" />
            <Text
              style={{
                color: "white",
                fontWeight: "bold",
                fontSize: 24,
                marginVertical: 8,
              }}
            >
              {riskScore > 0.7 ? "CRITICAL RISK" : "WARNING"}
            </Text>
            <Text
              style={{
                color: "white",
                fontSize: 16,
                textAlign: "center",
                opacity: 0.9,
              }}
            >
              Stability: {Math.max(0, 100 - riskScore * 100).toFixed(0)}%
            </Text>

            {/* NEW: CURVE DISTANCE WARNING */}
            {myBus?.currentStatus?.distToCurve > 0 && (
              <View
                style={{
                  marginTop: 12,
                  backgroundColor: "rgba(0,0,0,0.3)",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="return-up-forward" size={24} color="#fff" />
                <Text
                  style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}
                >
                  Curve Ahead: {myBus.currentStatus.distToCurve.toFixed(0)} m
                </Text>
              </View>
            )}

            <View
              style={{
                marginTop: 12,
                backgroundColor: "rgba(0,0,0,0.2)",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 4,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>
                SLOW DOWN IMMEDIATELY
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* GPS Feed Status Card */}
      <Card style={styles.gpsFeedCard}>
        <View style={styles.gpsFeedRow}>
          <View style={styles.gpsFeedInfo}>
            <View style={styles.gpsFeedDotRow}>
              <View
                style={[
                  styles.gpsDot,
                  gpsFeedActive ? styles.gpsDotActive : styles.gpsDotInactive,
                ]}
              />
              <Text style={styles.gpsFeedTitle}>
                GPS Feed: {gpsFeedActive ? "Active" : "Inactive"}
              </Text>
            </View>
            {gpsData ? (
              <Text style={styles.gpsFeedDetail}>
                {gpsData.lat.toFixed(4)}, {gpsData.lon.toFixed(4)} •{" "}
                {gpsData.speed.toFixed(0)} km/h
              </Text>
            ) : (
              <Text style={styles.gpsFeedDetail}>
                Waiting for GPS signal...
              </Text>
            )}
          </View>
          <Ionicons
            name="navigate"
            size={20}
            color={gpsFeedActive ? "#22c55e" : "#94a3b8"}
          />
        </View>
      </Card>

      {/* Main Bus Card (Dark Theme like Frontend) */}
      <Card style={styles.mainCard}>
        <View style={styles.mainCardContent}>
          <View style={styles.busIdentity}>
            <View style={styles.busIconContainer}>
              <Ionicons name="bus" size={32} color="#fff" />
            </View>
            <View>
              <Text style={styles.licensePlate}>
                {myBus?.licensePlate || myBus?.busNumber || "Unknown"}
              </Text>
              <View style={styles.locationContainer}>
                <Ionicons name="location-sharp" size={14} color="#94a3b8" />
                <Text style={styles.locationText}>{locationName}</Text>
              </View>
              <Text style={styles.routeText}>
                Route {myBus?.routeId || myBus?.routeNumber}
              </Text>
            </View>
          </View>

          <View style={styles.statusContainer}>
            <View style={styles.statusBadgeContainer}>
              <Text style={styles.statusLabel}>Status</Text>
              <View
                style={[
                  styles.badge,
                  myBus?.currentStatus
                    ? styles.badgeSuccess
                    : styles.badgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    myBus?.currentStatus
                      ? styles.textSuccess
                      : styles.textInactive,
                  ]}
                >
                  {myBus?.currentStatus ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
            <View style={styles.capacityContainer}>
              <Text style={styles.statusLabel}>Capacity</Text>
              <Text style={styles.capacityValue}>{myBus?.capacity || 55}</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Quick Stats Grid */}
      <View style={styles.grid}>
        <Card style={styles.statCard}>
          <Ionicons name="speedometer" size={24} color={Colors.primary} />
          <Text style={styles.statValue}>
            {myBus?.currentStatus?.speed || 0} km/h
          </Text>
          <Text style={styles.statLabel}>Current Speed</Text>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="people" size={24} color={Colors.success} />
          <Text style={styles.statValue}>
            {myBus?.currentStatus?.currentOccupancy || 0}
          </Text>
          <Text style={styles.statLabel}>Passengers</Text>
        </Card>
      </View>

      {/* Recent Violations */}
      <Card style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="alert-circle" size={20} color={Colors.warning} />
          <Text style={styles.cardTitle}>Recent Alerts</Text>
        </View>

        {!violations || violations.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.dotSuccess} />
            <Text style={styles.emptyStateText}>
              No active violations or alerts.
            </Text>
          </View>
        ) : (
          violations.map((v, index) => (
            <View key={index} style={styles.violationItem}>
              <View style={styles.violationHeader}>
                <Text style={styles.violationType}>
                  {v.violationType || v.type}
                </Text>
                <Text style={styles.violationTime}>
                  {new Date(v.createdAt || v.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              <Text style={styles.violationDetail}>
                Speed: {v.speed || 0} km/h • Loc: {v.gps?.lat?.toFixed(4)},{" "}
                {v.gps?.lon?.toFixed(4)}
              </Text>
            </View>
          ))
        )}
      </Card>

      {/* Historical Logs List (Replacing Chart for Mobile) */}
      <Card style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="time" size={20} color={Colors.primary} />
          <Text style={styles.cardTitle}>Recent Activity Log</Text>
        </View>

        {logs.length === 0 ? (
          <Text style={styles.emptyText}>No logs available.</Text>
        ) : (
          logs.slice(0, 5).map((log, index) => (
            <View key={index} style={styles.logItem}>
              <Text style={styles.logTime}>
                {new Date(log.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <View style={styles.logStats}>
                <Text style={styles.logStatText}>
                  Occ: {log.currentOccupancy}
                </Text>
                <Text style={styles.logStatText}>Spd: {log.speed} km/h</Text>
              </View>
            </View>
          ))
        )}
      </Card>

      <View style={styles.footerInfo}>
        <Text style={styles.lastUpdated}>
          Updated: {lastUpdated.toLocaleTimeString()}
        </Text>
      </View>

      <Button
        style={styles.maintenanceButton}
        onPress={() => router.push("/(conductor)/maintenance")}
      >
        Report Maintenance Issue
      </Button>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
  },
  pageSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 40,
    minWidth: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  /* Main Dark Card */
  mainCard: {
    backgroundColor: "#0f172a", // Dark Blue/Slate
    padding: 0, // Reset padding for custom layout
    overflow: "hidden",
    marginBottom: 24,
    borderWidth: 0,
  },
  mainCardContent: {
    padding: 20,
  },
  busIdentity: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  busIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  licensePlate: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 16,
    color: "#94a3b8",
  },
  routeText: {
    fontSize: 16,
    color: "#94a3b8",
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadgeContainer: {
    alignItems: "flex-start",
  },
  capacityContainer: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 4,
  },
  capacityValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  badgeSuccess: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
  },
  badgeInactive: {
    backgroundColor: "rgba(148, 163, 184, 0.2)",
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  textSuccess: {
    color: "#4ade80",
  },
  textInactive: {
    color: "#cbd5e1",
  },
  /* Grid Stats */
  grid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  /* Section Cards */
  sectionCard: {
    marginBottom: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  /* Violations */
  emptyState: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dotSuccess: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  emptyStateText: {
    color: "#15803d",
    fontWeight: "500",
    fontSize: 14,
  },
  violationItem: {
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fee2e2",
    marginBottom: 8,
  },
  violationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  violationType: {
    color: "#dc2626",
    fontWeight: "600",
    fontSize: 14,
  },
  violationTime: {
    fontSize: 12,
    color: "#94a3b8",
  },
  violationDetail: {
    fontSize: 12,
    color: "#64748b",
  },
  maintenanceButton: {
    backgroundColor: "#0f172a", // Dark styling for action button
    marginTop: 8,
  },
  /* Logs */
  logItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logTime: {
    color: Colors.text,
    fontWeight: "500",
  },
  logStats: {
    flexDirection: "row",
    gap: 12,
  },
  logStatText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontStyle: "italic",
  },
  footerInfo: {
    marginTop: 16,
    alignItems: "center",
  },
  lastUpdated: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  /* GPS Feed Card */
  gpsFeedCard: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  gpsFeedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gpsFeedInfo: {
    flex: 1,
  },
  gpsFeedDotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  gpsDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  gpsDotActive: {
    backgroundColor: "#22c55e",
  },
  gpsDotInactive: {
    backgroundColor: "#94a3b8",
  },
  gpsFeedTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#15803d",
  },
  gpsFeedDetail: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 18,
  },
});
