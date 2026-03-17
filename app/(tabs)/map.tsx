// app/(tabs)/map.tsx — Campus Heat Map with toggle
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { UTA } from "../../constants/theme";
import { auth, db } from "../../firebase/firebase";
import MapView, { PROVIDER_GOOGLE, Heatmap, Marker } from "react-native-maps";

// ── Campus locations with markers ──
const campusLocations = [
  { id: "nedderman-hall", label: "Nedderman Hall", short: "NH", row: 0, col: 0, type: "academic" },
  { id: "ero-building", label: "ERB Building", short: "ERB", row: 0, col: 1, type: "academic" },
  { id: "woolf-hall", label: "Woolf Hall", short: "WH", row: 0, col: 2, type: "academic" },
  { id: "science-hall", label: "Science Hall", short: "SH", row: 1, col: 0, type: "academic" },
  { id: "life-science", label: "Life Science", short: "LS", row: 1, col: 1, type: "academic" },
  { id: "pickard-hall", label: "Pickard Hall", short: "PKH", row: 1, col: 2, type: "academic" },
  { id: "college-of-business", label: "College of Business", short: "COBA", row: 2, col: 0, type: "academic" },
  { id: "university-hall", label: "University Hall", short: "UH", row: 2, col: 1, type: "academic" },
  { id: "trimble-hall", label: "Trimble Hall", short: "TH", row: 2, col: 2, type: "academic" },
  { id: "university-center", label: "University Center", short: "UC", row: 3, col: 0, type: "student", hasFloors: false },
  { id: "central-library", label: "Central Library", short: "LIB", row: 3, col: 1, type: "student", hasFloors: true, floors: [1, 2, 3, 4, 5, 6] },
  { id: "mac-fitness", label: "MAC Fitness", short: "MAC", row: 3, col: 2, type: "student" },
  { id: "commons", label: "The Commons", short: "COM", row: 4, col: 0, type: "dining" },
  { id: "college-park-center", label: "College Park Center", short: "CPC", row: 4, col: 1, type: "student" },
  { id: "smart-hospital", label: "SMART Hospital", short: "SMRT", row: 4, col: 2, type: "academic" },
];

const campusMarkers = [
  { id: "uc", title: "University Center (UC)", description: "Hub for dining, events, and student organizations.", coordinate: { latitude: 32.7303, longitude: -97.1122 } },
  { id: "lib", title: "Central Library", description: "Main campus library and study space.", coordinate: { latitude: 32.7291, longitude: -97.1143 } },
  { id: "mac", title: "Maverick Activity Center (MAC)", description: "Campus recreation and fitness center.", coordinate: { latitude: 32.7335, longitude: -97.1147 } },
  { id: "com", title: "The Commons", description: "Dining hall and student gathering space.", coordinate: { latitude: 32.73, longitude: -97.1165 } },
  { id: "planetarium", title: "Planetarium", description: "State-of-the-art planetarium at UTA.", coordinate: { latitude: 32.7305, longitude: -97.1135 } },
];

const locationLabels = campusLocations.map((l) => l.label);
const crowdOptions = ["Low", "Medium", "High"];
const noiseOptions = ["Quiet", "Moderate", "Loud"];

type CrowdLevel = "unknown" | "low" | "medium" | "high";
interface CrowdData { level: CrowdLevel; reportCount: number; noiseLevel: string; }

function crowdToColor(level: CrowdLevel): string {
  switch (level) {
    case "low": return UTA.green;
    case "medium": return UTA.yellow;
    case "high": return UTA.red;
    default: return UTA.gray200;
  }
}
function crowdToOpacity(level: CrowdLevel): number {
  switch (level) {
    case "low": return 0.55;
    case "medium": return 0.72;
    case "high": return 0.9;
    default: return 0.28;
  }
}
function crowdLabel(level: CrowdLevel): string {
  switch (level) {
    case "low": return "Quiet";
    case "medium": return "Moderate";
    case "high": return "Busy";
    default: return "No Data";
  }
}
function normalizeCrowdLevel(raw: string): "low" | "medium" | "high" {
  const s = raw.toLowerCase().trim();
  if (s.includes("high") || s.includes("crowded") || s.includes("busy")) return "high";
  if (s.includes("medium") || s.includes("moderate") || s.includes("mid")) return "medium";
  return "low";
}
function timeBasedEstimate(): CrowdLevel {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  if (day === 0 || day === 6) return "low";
  if (hour >= 10 && hour <= 14) return "high";
  if ((hour >= 8 && hour < 10) || (hour > 14 && hour <= 18)) return "medium";
  return "low";
}

// Pulsing dot component
function PulsingDot({ color }: { color: string }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={s.pulseWrapper}>
      <Animated.View style={[s.pulseRing, { backgroundColor: color + "40", transform: [{ scale: pulseAnim }] }]} />
      <View style={[s.pulseDot, { backgroundColor: color }]} />
    </View>
  );
}

export default function MapScreen() {
  const user = auth.currentUser;
  const isGuest = user?.isAnonymous;

  const [crowdMap, setCrowdMap] = useState<Record<string, CrowdData>>({});
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "academic" | "student" | "dining">("all");
  const [libraryFloor, setLibraryFloor] = useState(1);

  // FAB / Report modal state
  const [fabOpen, setFabOpen] = useState(false);
  const [reportStep, setReportStep] = useState(0); // 0=location, 1=crowd, 2=noise
  const [reportLocation, setReportLocation] = useState("");
  const [reportCrowd, setReportCrowd] = useState("");
  const [reportNoise, setReportNoise] = useState("");
  const [cooldownMins, setCooldownMins] = useState(0);

  // NEW: toggle for bottom heatmap
  const [showHeatmap, setShowHeatmap] = useState(false);

  // ── Cooldown timer
  useEffect(() => {
    if (!user || isGuest) return;
    const interval = setInterval(async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const last = snap.data().lastReportTime?.toDate();
          if (last) {
            const diff = 30 * 60 * 1000 - (Date.now() - last.getTime());
            setCooldownMins(diff > 0 ? Math.ceil(diff / 60000) : 0);
          } else { setCooldownMins(0); }
        }
      } catch { }
    }, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Listen for reports
  useEffect(() => {
    const threeHoursAgo = new Date();
    threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);
    const q = query(
      collection(db, "campusReports"),
      where("createdAt", ">=", threeHoursAgo),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const agg: Record<string, { crowds: string[]; noises: string[] }> = {};
      snapshot.forEach((d) => {
        const data = d.data();
        const loc = (data.location || "").toLowerCase().trim();
        if (!agg[loc]) agg[loc] = { crowds: [], noises: [] };
        if (data.crowdLevel) agg[loc].crowds.push(data.crowdLevel);
        if (data.noiseLevel) agg[loc].noises.push(data.noiseLevel);
      });
      const result: Record<string, CrowdData> = {};
      for (const loc of campusLocations) {
        const matchKey = Object.keys(agg).find(
          (k) => k.includes(loc.label.toLowerCase()) || k.includes(loc.short.toLowerCase()) || loc.label.toLowerCase().includes(k)
        );
        if (matchKey && agg[matchKey].crowds.length > 0) {
          const crowds = agg[matchKey].crowds.map(normalizeCrowdLevel);
          const counts = { low: 0, medium: 0, high: 0 };
          crowds.forEach((c) => counts[c]++);
          const level = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as CrowdLevel;
          result[loc.id] = { level, reportCount: crowds.length, noiseLevel: agg[matchKey].noises[0] || "Unknown" };
        }
      }
      setCrowdMap(result);
    });
    return unsub;
  }, []);

  const filteredLocations = useMemo(() => {
    if (filter === "all") return campusLocations;
    return campusLocations.filter((l) => l.type === filter);
  }, [filter]);

  const rows = useMemo(() => {
    const grouped: Record<number, typeof campusLocations> = {};
    for (const loc of filteredLocations) {
      if (!grouped[loc.row]) grouped[loc.row] = [];
      grouped[loc.row].push(loc);
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, locs]) => locs.sort((a, b) => a.col - b.col));
  }, [filteredLocations]);

  const selected = selectedLocation ? campusLocations.find((l) => l.id === selectedLocation) : null;
  const selectedData = selectedLocation ? crowdMap[selectedLocation] : null;

  // Submit report
  const submitReport = useCallback(async () => {
    if (!user || isGuest) {
      Alert.alert("Sign In Required", "Only registered users can submit reports.");
      return;
    }
    if (cooldownMins > 0) {
      Alert.alert("Cooldown Active", `Please wait ${cooldownMins} minutes before reporting again.`);
      return;
    }
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) await setDoc(userRef, { points: 0, lastReportTime: null });

      await addDoc(collection(db, "campusReports"), {
        location: reportLocation,
        crowdLevel: reportCrowd,
        noiseLevel: reportNoise,
        createdAt: serverTimestamp(),
        userId: user.uid,
      });
      const currentPoints = userSnap.exists() ? (userSnap.data().points || 0) : 0;
      await updateDoc(userRef, { lastReportTime: serverTimestamp(), points: currentPoints + 10 });

      Alert.alert("Report Submitted! 🎉", "You earned 10 MavPoints.");
      setFabOpen(false);
      setReportStep(0);
      setReportLocation("");
      setReportCrowd("");
      setReportNoise("");
      setCooldownMins(30);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to submit report.");
    }
  }, [user, isGuest, cooldownMins, reportLocation, reportCrowd, reportNoise]);

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {/* Title & Subtitle */}
        <Text style={s.title}>Campus Heat Map</Text>
        <Text style={s.subtitle}>Real-time crowd & noise from student reports</Text>

        {/* Legend */}
        <View style={s.legend}>
          {[{ color: UTA.gray200, label: "No Data" }, { color: UTA.green, label: "Quiet" }, { color: UTA.yellow, label: "Moderate" }, { color: UTA.red, label: "Busy/Loud" }].map((item) => (
            <View key={item.label} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: item.color }]} />
              <Text style={s.legendText}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Filter */}
        <View style={s.filterRow}>
          {(["all", "academic", "student", "dining"] as const).map((f) => (
            <TouchableOpacity key={f} style={[s.filterTab, filter === f && s.filterTabActive]} onPress={() => setFilter(f)}>
              <Text style={[s.filterText, filter === f && s.filterTextActive]}>
                {f === "all" ? "All" : f === "academic" ? "Academic" : f === "student" ? "Student" : "Dining"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Heat Map Grid */}
        <View style={s.gridContainer}>
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={s.gridRow}>
              {row.map((loc) => {
                const data = crowdMap[loc.id];
                const level = data?.level || timeBasedEstimate();
                const color = crowdToColor(level);
                const opacity = crowdToOpacity(level);
                const isSelected = selectedLocation === loc.id;

                return (
                  <TouchableOpacity
                    key={loc.id}
                    style={[s.gridCell, { backgroundColor: color, opacity }, isSelected && s.gridCellSelected]}
                    onPress={() => setSelectedLocation(isSelected ? null : loc.id)}
                    activeOpacity={0.6}
                  >
                    {level === "high" && <PulsingDot color={UTA.red} />}
                    <Text style={s.cellShort}>{loc.short}</Text>
                    <Text style={s.cellLabel}>{crowdLabel(level)}</Text>
                    {data && <Text style={s.cellReports}>{data.reportCount} report{data.reportCount !== 1 ? "s" : ""}</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Selected Location Details */}
        {selected && (
          <View style={s.detailCard}>
            <Text style={s.detailTitle}>{selected.label}</Text>
            <View style={s.detailRow}>
              <Text style={s.detailKey}>Crowd Level:</Text>
              <Text style={[s.detailValue, { color: crowdToColor(selectedData?.level || timeBasedEstimate()) }]}>
                {crowdLabel(selectedData?.level || timeBasedEstimate())}
              </Text>
            </View>
            {selectedData && (
              <>
                <View style={s.detailRow}>
                  <Text style={s.detailKey}>Noise Level:</Text>
                  <Text style={s.detailValue}>{selectedData.noiseLevel}</Text>
                </View>
                <View style={s.detailRow}>
                  <Text style={s.detailKey}>Reports (3h):</Text>
                  <Text style={s.detailValue}>{selectedData.reportCount}</Text>
                </View>
              </>
            )}
            {(selected as any).hasFloors && (
              <View style={s.floorSection}>
                <Text style={s.floorLabel}>Floor:</Text>
                <View style={s.floorRow}>
                  {(selected as any).floors.map((f: number) => (
                    <TouchableOpacity key={f} style={[s.floorBtn, libraryFloor === f && s.floorBtnActive]} onPress={() => setLibraryFloor(f)}>
                      <Text style={[s.floorBtnText, libraryFloor === f && s.floorBtnTextActive]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={s.floorNote}>Floor {libraryFloor} data shown (from crowd reports mentioning this floor)</Text>
              </View>
            )}
            {!selectedData && <Text style={s.detailNote}>No recent reports — showing estimate. Tap the map for live updates!</Text>}
          </View>
        )}

        {/* TOGGLE Button for full Campus Heatmap */}
        <TouchableOpacity
          style={s.heatmapToggle}
          onPress={() => setShowHeatmap(!showHeatmap)}
        >
          <Text style={s.heatmapToggleText}>{showHeatmap ? "Hide Campus Heatmap" : "View Campus Heatmap"}</Text>
        </TouchableOpacity>

        {/* Full Heatmap Map */}
        {showHeatmap && (
          <View style={s.fullMapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={{ flex: 1 }}
              initialRegion={{
                latitude: 32.7303,
                longitude: -97.1140,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Heatmap
                points={campusMarkers.map((loc) => ({
                  latitude: loc.coordinate.latitude,
                  longitude: loc.coordinate.longitude,
                  weight: (crowdMap[loc.id]?.reportCount || 0) + 1,
                }))}
                radius={100}
                opacity={0.7}
                gradient={{ colors: ["#00ff00", "#ffff00", "#ff0000"], startPoints: [0.1, 0.5, 1], colorMapSize: 256 }}
              />
              {campusMarkers.map((loc) => (
                <Marker
                  key={loc.id}
                  coordinate={{ latitude: loc.coordinate.latitude, longitude: loc.coordinate.longitude }}
                  title={loc.title}
                  description={loc.description}
                />
              ))}
            </MapView>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9f9f9" },
  container: { padding: 16 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#555", marginBottom: 16 },
  legend: { flexDirection: "row", justifyContent: "space-around", marginBottom: 16 },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
  legendText: { fontSize: 12 },
  filterRow: { flexDirection: "row", marginBottom: 16, justifyContent: "space-between" },
  filterTab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#eee" },
  filterTabActive: { backgroundColor: UTA.royalBlue },
  filterText: { fontSize: 12 },
  filterTextActive: { color: "#fff" },
  gridContainer: { marginBottom: 16 },
  gridRow: { flexDirection: "row", marginBottom: 8 },
  gridCell: { flex: 1, marginHorizontal: 4, padding: 6, borderRadius: 8, alignItems: "center" },
  gridCellSelected: { borderWidth: 2, borderColor: UTA.royalBlue },
  cellShort: { fontWeight: "bold" },
  cellLabel: { fontSize: 10 },
  cellReports: { fontSize: 10, color: "#333" },
  pulseWrapper: { position: "absolute", top: 6, left: 6 },
  pulseRing: { width: 12, height: 12, borderRadius: 6, position: "absolute" },
  pulseDot: { width: 12, height: 12, borderRadius: 6 },
  detailCard: { backgroundColor: "#fff", padding: 12, borderRadius: 12, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  detailTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 6 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  detailKey: { fontWeight: "600" },
  detailValue: { fontWeight: "600" },
  floorSection: { marginTop: 8 },
  floorLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  floorRow: { flexDirection: "row" },
  floorBtn: { padding: 6, borderRadius: 6, backgroundColor: "#eee", marginRight: 4 },
  floorBtnActive: { backgroundColor: UTA.royalBlue },
  floorBtnText: { fontSize: 12 },
  floorBtnTextActive: { color: "#fff" },
  floorNote: { fontSize: 10, color: "#666", marginTop: 4 },
  detailNote: { fontSize: 12, color: "#888", marginTop: 4 },
  heatmapToggle: { backgroundColor: UTA.royalBlue, paddingVertical: 12, borderRadius: 12, alignItems: "center", marginVertical: 12 },
  heatmapToggleText: { color: "#fff", fontWeight: "bold" },
  fullMapContainer: { height: 400, borderRadius: 14, overflow: "hidden", marginBottom: 16 },
});