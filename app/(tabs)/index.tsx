// app/(tabs)/index.tsx — Unified Dashboard
import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { UTA } from "../../constants/theme";
import { auth, db } from "../../firebase/firebase";

const { width, height } = Dimensions.get("window");

// ── Mock / live status helpers ──
function getGymCapacity(): number {
  const hour = new Date().getHours();
  const peak: Record<number, number> = {
    6: 15, 7: 25, 8: 35, 9: 40, 10: 45, 11: 50,
    12: 65, 13: 55, 14: 45, 15: 50,
    16: 70, 17: 85, 18: 95, 19: 80, 20: 55, 21: 35, 22: 15,
  };
  return peak[hour] ?? 20;
}

function getNextBus(): { route: string; mins: number; color: string } {
  const buses = [
    { route: "Blue Route", mins: 4, color: "#1E90FF" },
    { route: "Orange Route", mins: 7, color: UTA.blazeOrange },
    { route: "Express Route", mins: 12, color: "#FF5733" },
  ];
  return buses[Math.floor(Date.now() / 60000) % buses.length];
}

function getDiningStatus(): { name: string; open: boolean } {
  const hour = new Date().getHours();
  return { name: "Connection Cafe", open: hour >= 7 && hour <= 22 };
}

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mavPoints, setMavPoints] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-280));
  const [currentTime, setCurrentTime] = useState(new Date());
  const [campusActivity, setCampusActivity] = useState<string>("Low");

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  // MavPoints
  useEffect(() => {
    if (!user || user.isAnonymous) { setMavPoints(0); return; }
    const userRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) setMavPoints(snap.data().points || 0);
    });
    return unsub;
  }, [user]);

  // Campus activity from recent reports
  useEffect(() => {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const q = query(
      collection(db, "campusReports"),
      where("createdAt", ">=", oneHourAgo),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const count = snap.size;
      if (count >= 10) setCampusActivity("High");
      else if (count >= 4) setCampusActivity("Moderate");
      else setCampusActivity("Low");
    });
    return unsub;
  }, []);

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start();
  };
  const closeMenu = () => {
    Animated.timing(slideAnim, { toValue: -280, duration: 250, useNativeDriver: false }).start(() => setMenuVisible(false));
  };
  const handleLogout = async () => {
    try { await signOut(auth); closeMenu(); router.replace("/AuthScreen"); } catch (e) { console.error(e); }
  };

  const isGuest = user?.isAnonymous;
  const bus = getNextBus();
  const gym = getGymCapacity();
  const dining = getDiningStatus();
  const activityColor = campusActivity === "High" ? UTA.red : campusActivity === "Moderate" ? UTA.yellow : UTA.green;

  const timeStr = currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = currentTime.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={openMenu} style={styles.profileBtn}>
            <Image
              source={{ uri: "https://img.icons8.com/ios-filled/50/FFFFFF/user-male-circle.png" }}
              style={styles.profileIcon}
            />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTime}>{timeStr}</Text>
            <Text style={styles.headerDate}>{dateStr}</Text>
          </View>
          {!isGuest && user && (
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsEmoji}>💰</Text>
              <Text style={styles.pointsText}>{mavPoints}</Text>
            </View>
          )}
        </View>

        {/* ── Welcome ── */}
        <Text style={styles.welcomeText}>
          {isGuest ? "Welcome, Guest" : `Welcome, Maverick`}
        </Text>
        <Text style={styles.appTitle}>UTA CampusFlow</Text>

        {/* ── Status Widgets (Horizontal Scroll) ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.widgetsRow}
          style={styles.widgetsScroll}
        >
          {/* Bus Widget */}
          <TouchableOpacity
            style={[styles.widget, { borderTopColor: bus.color }]}
            onPress={() => router.push("/bus-tracker")}
          >
            <Text style={styles.widgetIcon}>🚌</Text>
            <Text style={styles.widgetTitle}>{bus.route}</Text>
            <Text style={[styles.widgetValue, { color: bus.color }]}>{bus.mins} min</Text>
            <Text style={styles.widgetLabel}>Next arrival</Text>
          </TouchableOpacity>

          {/* Gym Widget with Progress Ring */}
          <TouchableOpacity
            style={[styles.widget, { borderTopColor: gym > 75 ? UTA.red : gym > 50 ? UTA.yellow : UTA.green }]}
            onPress={() => router.push("/fitness-center")}
          >
            <Text style={styles.widgetIcon}>💪</Text>
            <Text style={styles.widgetTitle}>MAC Gym</Text>
            {/* Progress Ring (simplified bar) */}
            <View style={styles.ringContainer}>
              <View style={styles.ringBg}>
                <View
                  style={[
                    styles.ringFill,
                    {
                      width: `${gym}%`,
                      backgroundColor: gym > 75 ? UTA.red : gym > 50 ? UTA.yellow : UTA.green,
                    },
                  ]}
                />
              </View>
              <Text style={styles.ringText}>{gym}%</Text>
            </View>
            <Text style={styles.widgetLabel}>Capacity</Text>
          </TouchableOpacity>

          {/* Dining Widget */}
          <TouchableOpacity
            style={[styles.widget, { borderTopColor: dining.open ? UTA.green : UTA.red }]}
            onPress={() => router.push("/dining-availability")}
          >
            <Text style={styles.widgetIcon}>🍽️</Text>
            <Text style={styles.widgetTitle}>{dining.name}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: dining.open ? UTA.green : UTA.red }]} />
              <Text style={[styles.widgetValue, { color: dining.open ? UTA.green : UTA.red }]}>
                {dining.open ? "OPEN" : "CLOSED"}
              </Text>
            </View>
            <Text style={styles.widgetLabel}>Right now</Text>
          </TouchableOpacity>

          {/* Campus Activity Widget */}
          <View style={[styles.widget, { borderTopColor: activityColor }]}>
            <Text style={styles.widgetIcon}>📊</Text>
            <Text style={styles.widgetTitle}>Campus</Text>
            <Text style={[styles.widgetValue, { color: activityColor }]}>{campusActivity}</Text>
            <Text style={styles.widgetLabel}>Activity</Text>
          </View>
        </ScrollView>

        {/* ── Quick Actions Grid ── */}
        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(tabs)/map")}
          >
            <Text style={styles.actionIcon}>🗺️</Text>
            <Text style={styles.actionText}>Heat Map</Text>
            <Text style={styles.actionSub}>Live crowd data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, isGuest && styles.actionDisabled]}
            onPress={() => !isGuest && router.push("/campus-activity")}
            disabled={isGuest}
          >
            <Text style={styles.actionIcon}>📈</Text>
            <Text style={styles.actionText}>Activity</Text>
            <Text style={styles.actionSub}>Campus trends</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/library")}
          >
            <Text style={styles.actionIcon}>📚</Text>
            <Text style={styles.actionText}>Library</Text>
            <Text style={styles.actionSub}>Floors & noise</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/dining-availability")}
          >
            <Text style={styles.actionIcon}>🍔</Text>
            <Text style={styles.actionText}>Dining</Text>
            <Text style={styles.actionSub}>What's open</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/fitness-center")}
          >
            <Text style={styles.actionIcon}>🏋️</Text>
            <Text style={styles.actionText}>MAC Gym</Text>
            <Text style={styles.actionSub}>Zone tracking</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/bus-tracker")}
          >
            <Text style={styles.actionIcon}>🚍</Text>
            <Text style={styles.actionText}>Bus</Text>
            <Text style={styles.actionSub}>Route tracker</Text>
          </TouchableOpacity>
        </View>

        {/* Guest banner */}
        {isGuest && (
          <View style={styles.guestBanner}>
            <Text style={styles.guestText}>
              🔒 Sign in with your @mavs.uta.edu email to report data and earn MavPoints!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Side Menu ── */}
      {menuVisible && (
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.sideMenu, { left: slideAnim }]}>
                <View style={styles.menuHeader}>
                  <Text style={styles.menuAvatar}>👤</Text>
                  <Text style={styles.menuEmail} numberOfLines={1}>
                    {user?.email || "Guest"}
                  </Text>
                  {!isGuest && (
                    <View style={styles.menuPointsBadge}>
                      <Text style={styles.menuPointsText}>💰 {mavPoints} pts</Text>
                    </View>
                  )}
                </View>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); router.push("/(tabs)/survey"); }}>
                  <Text style={styles.menuItemText}>📝  Submit Report</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); router.push("/(tabs)/map"); }}>
                  <Text style={styles.menuItemText}>🗺️  Heat Map</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); router.push("/fitness-center"); }}>
                  <Text style={styles.menuItemText}>💪  MAC Gym</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); router.push("/library"); }}>
                  <Text style={styles.menuItemText}>📚  Library</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuLogout} onPress={handleLogout}>
                  <Text style={styles.menuLogoutText}>Logout</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: UTA.offWhite },
  container: {
    paddingHorizontal: 18,
    paddingTop: 54,
    paddingBottom: 30,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: UTA.royalBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  profileIcon: { width: 30, height: 30, borderRadius: 15 },
  headerCenter: { alignItems: "center", flex: 1 },
  headerTime: { fontSize: 22, fontWeight: "bold", color: UTA.gray800 },
  headerDate: { fontSize: 12, color: UTA.gray500 },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: UTA.blazeOrange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pointsEmoji: { fontSize: 14, marginRight: 4 },
  pointsText: { color: "#fff", fontWeight: "bold", fontSize: 15 },

  // Welcome
  welcomeText: { fontSize: 14, color: UTA.gray500, marginTop: 4 },
  appTitle: { fontSize: 26, fontWeight: "bold", color: UTA.royalBlue, marginBottom: 16 },

  // Widgets
  widgetsScroll: { marginBottom: 20 },
  widgetsRow: { paddingRight: 8, gap: 12 },
  widget: {
    width: 150,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderTopWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  widgetIcon: { fontSize: 22, marginBottom: 6 },
  widgetTitle: { fontSize: 13, fontWeight: "600", color: UTA.gray600, marginBottom: 4 },
  widgetValue: { fontSize: 20, fontWeight: "bold" },
  widgetLabel: { fontSize: 11, color: UTA.gray400, marginTop: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  ringContainer: { marginVertical: 4 },
  ringBg: { height: 8, backgroundColor: UTA.gray200, borderRadius: 4, overflow: "hidden" },
  ringFill: { height: 8, borderRadius: 4 },
  ringText: { fontSize: 18, fontWeight: "bold", color: UTA.gray800, marginTop: 2 },

  // Actions
  sectionLabel: { fontSize: 16, fontWeight: "bold", color: UTA.gray800, marginBottom: 10 },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  actionCard: {
    width: (width - 56) / 3,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  actionDisabled: { opacity: 0.45 },
  actionIcon: { fontSize: 26, marginBottom: 6 },
  actionText: { fontSize: 13, fontWeight: "bold", color: UTA.gray800 },
  actionSub: { fontSize: 10, color: UTA.gray400, marginTop: 2, textAlign: "center" },

  // Guest
  guestBanner: {
    backgroundColor: UTA.lightBlue,
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: UTA.royalBlue,
    marginTop: 4,
  },
  guestText: { fontSize: 13, color: UTA.royalBlue, lineHeight: 18 },

  // Overlay / Menu
  overlay: { position: "absolute", top: 0, left: 0, width, height, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 100 },
  sideMenu: {
    position: "absolute",
    top: 0,
    width: 280,
    height: "100%",
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 4, height: 0 },
    shadowRadius: 12,
    elevation: 10,
  },
  menuHeader: { alignItems: "center", marginBottom: 16 },
  menuAvatar: { fontSize: 48, marginBottom: 8 },
  menuEmail: { fontSize: 14, color: UTA.gray600, marginBottom: 6 },
  menuPointsBadge: {
    backgroundColor: UTA.blazeOrange,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  menuPointsText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  menuDivider: { height: 1, backgroundColor: UTA.gray200, marginVertical: 12 },
  menuItem: { paddingVertical: 12 },
  menuItemText: { fontSize: 16, color: UTA.gray800, fontWeight: "500" },
  menuLogout: {
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: UTA.red + "15",
    borderRadius: 8,
    alignItems: "center",
  },
  menuLogoutText: { fontSize: 16, color: UTA.red, fontWeight: "bold" },
});