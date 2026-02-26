// app/index.tsx
import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
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
import { auth, db } from "../../firebase/firebase";

const { width, height } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mavPoints, setMavPoints] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-250)); // side menu start off-screen

  // Track auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribeAuth;
  }, []);

  // Listen for real-time MavPoints updates for registered users
  useEffect(() => {
    if (!user || user.isAnonymous) {
      setMavPoints(0);
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMavPoints(data.points || 0);
      }
    });

    return unsubscribeSnapshot;
  }, [user]);

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: -250,
      duration: 250,
      useNativeDriver: false,
    }).start(() => setMenuVisible(false));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      closeMenu();
      router.replace("/AuthScreen");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const isGuest = user?.isAnonymous;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openMenu}>
          <Image
            source={{ uri: "https://img.icons8.com/ios-filled/50/user.png" }}
            style={styles.profileIcon}
          />
        </TouchableOpacity>

        <View style={styles.headerSpacer} />

        {/* MavPoints for registered users only */}
        {!isGuest && user && (
          <View style={styles.pointsContainer}>
            <Text style={styles.pointsText}>{mavPoints} MavPoints💰</Text>
          </View>
        )}
      </View>

      {/* Main title */}
      <Text style={styles.title}>UTA CampusFlow</Text>
      <Text style={styles.subtitle}>Quick access to key campus info</Text>

      {/* Buttons */}
      <TouchableOpacity
        style={[styles.button, isGuest && styles.buttonDisabled]}
        onPress={() => router.push("/campus-activity")}
        disabled={isGuest}
      >
        <Text style={styles.buttonText}>Campus Activity</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push("/library-noise")}>
        <Text style={styles.buttonText}>Library Noise Levels</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push("/dining-availability")}>
        <Text style={styles.buttonText}>Dining Availability</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push("/fitness-center")}>
        <Text style={styles.buttonText}>MAC Fitness Center</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push("/bus-tracker")}>
        <Text style={styles.buttonText}>Campus Bus Tracker</Text>
      </TouchableOpacity>

      {/* Side menu */}
      {menuVisible && (
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={styles.overlay}>
            <Animated.View style={[styles.sideMenu, { left: slideAnim }]}>
              <Text style={styles.menuTitle}>Menu</Text>
              <TouchableOpacity style={styles.menuButton} onPress={handleLogout}>
                <Text style={styles.menuButtonText}>Logout</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f4f6f8",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  profileIcon: { width: 40, height: 40, borderRadius: 20 },
  headerSpacer: { flex: 1 },
  pointsContainer: { backgroundColor: "#2563eb", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  pointsText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 10 },
  subtitle: { fontSize: 16, color: "#555", marginBottom: 30, textAlign: "center" },
  button: { width: 300, height: 60, backgroundColor: "#2563eb", justifyContent: "center", alignItems: "center", borderRadius: 10, marginBottom: 15 },
  buttonText: { color: "white", fontSize: 18, fontWeight: "bold" },
  buttonDisabled: { opacity: 0.5 },
  overlay: { position: "absolute", top: 0, left: 0, width, height, backgroundColor: "rgba(0,0,0,0.3)" },
  sideMenu: { position: "absolute", top: height / 2 - 100, width: 250, backgroundColor: "#fff", padding: 20, borderRadius: 8, elevation: 5 },
  menuTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
  menuButton: { paddingVertical: 10 },
  menuButtonText: { fontSize: 16, color: "#2563eb", fontWeight: "bold" },
});