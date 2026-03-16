// app/(tabs)/map.tsx — Campus Heat Map with Reporting FAB
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

// ── Pulsing dot component ──
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

  // Cooldown timer
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
      } catch { /* ignore */ }
    }, 15000);
    // Initial check
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user!.uid));
        if (snap.exists()) {
          const last = snap.data().lastReportTime?.toDate();
          if (last) {
            const diff = 30 * 60 * 1000 - (Date.now() - last.getTime());
            setCooldownMins(diff > 0 ? Math.ceil(diff / 60000) : 0);
          }
        }
      } catch { /* ignore */ }
    })();
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
        <Text style={s.title}>Campus Heat Map</Text>
        <Text style={s.subtitle}>Real-time crowd & noise from student reports</Text>

        {/* Legend */}
        <View style={s.legend}>
          {[
            { color: UTA.gray200, label: "No Data" },
            { color: UTA.green, label: "Quiet" },
            { color: UTA.yellow, label: "Moderate" },
            { color: UTA.red, label: "Busy/Loud" },
          ].map((item) => (
            <View key={item.label} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: item.color }]} />
              <Text style={s.legendText}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Filter */}
        <View style={s.filterRow}>
          {(["all", "academic", "student", "dining"] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[s.filterTab, filter === f && s.filterTabActive]}
              onPress={() => setFilter(f)}
            >
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
                    {/* Pulsing overlay for high-activity */}
                    {level === "high" && <PulsingDot color={UTA.red} />}
                    <Text style={s.cellShort}>{loc.short}</Text>
                    <Text style={s.cellLabel}>{crowdLabel(level)}</Text>
                    {data && (
                      <Text style={s.cellReports}>
                        {data.reportCount} report{data.reportCount !== 1 ? "s" : ""}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Selected Location Detail */}
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

            {/* Library Floor Toggle */}
            {(selected as any).hasFloors && (
              <View style={s.floorSection}>
                <Text style={s.floorLabel}>Floor:</Text>
                <View style={s.floorRow}>
                  {(selected as any).floors.map((f: number) => (
                    <TouchableOpacity
                      key={f}
                      style={[s.floorBtn, libraryFloor === f && s.floorBtnActive]}
                      onPress={() => setLibraryFloor(f)}
                    >
                      <Text style={[s.floorBtnText, libraryFloor === f && s.floorBtnTextActive]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={s.floorNote}>Floor {libraryFloor} data shown (from crowd reports mentioning this floor)</Text>
              </View>
            )}

            {!selectedData && (
              <Text style={s.detailNote}>
                No recent reports — showing estimate. Tap the + button to contribute!
              </Text>
            )}
          </View>
        )}

        {/* Summary */}
        <View style={s.summaryCard}>
          <Text style={s.sectionTitle}>📈 Campus-Wide Summary</Text>
          <View style={s.summaryGrid}>
            {(["low", "medium", "high", "unknown"] as CrowdLevel[]).map((level) => {
              const count = campusLocations.filter((l) => {
                const d = crowdMap[l.id];
                return d ? d.level === level : level === "unknown";
              }).length;
              return (
                <View key={level} style={s.summaryItem}>
                  <View style={[s.summaryDot, { backgroundColor: crowdToColor(level) }]} />
                  <Text style={s.summaryCount}>{count}</Text>
                  <Text style={s.summaryLabel}>{crowdLabel(level)}</Text>
                </View>
              );
            })}
          </View>
          <Text style={s.summaryNote}>
            Data refreshes in real-time. Tap + to submit a report!
          </Text>
        </View>

        {/* Cooldown indicator */}
        {cooldownMins > 0 && (
          <View style={s.cooldownBanner}>
            <Text style={s.cooldownText}>⏳ Report cooldown: {cooldownMins} min remaining</Text>
          </View>
        )}
      </ScrollView>

      {/* ── FAB (Floating Action Button) ── */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => {
          if (isGuest || !user) {
            Alert.alert("Sign In Required", "Only registered users can submit reports.");
            return;
          }
          if (cooldownMins > 0) {
            Alert.alert("Cooldown Active", `Wait ${cooldownMins} more minutes before reporting again.`);
            return;
          }
          setReportStep(0);
          setReportLocation("");
          setReportCrowd("");
          setReportNoise("");
          setFabOpen(true);
        }}
        activeOpacity={0.8}
      >
        <Text style={s.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* ── 3-Step Report Modal ── */}
      <Modal visible={fabOpen} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            {/* Stepper */}
            <View style={s.stepper}>
              {["Location", "Crowd", "Noise"].map((label, i) => (
                <View key={label} style={s.stepItem}>
                  <View style={[s.stepCircle, reportStep >= i && s.stepCircleActive]}>
                    <Text style={[s.stepNum, reportStep >= i && s.stepNumActive]}>{i + 1}</Text>
                  </View>
                  <Text style={[s.stepLabel, reportStep >= i && s.stepLabelActive]}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Step 0: Select Location */}
            {reportStep === 0 && (
              <View>
                <Text style={s.modalTitle}>Select Location</Text>
                <ScrollView style={s.optionScroll} showsVerticalScrollIndicator={false}>
                  {locationLabels.map((loc) => (
                    <TouchableOpacity
                      key={loc}
                      style={[s.optionBtn, reportLocation === loc && s.optionBtnActive]}
                      onPress={() => { setReportLocation(loc); setReportStep(1); }}
                    >
                      <Text style={[s.optionText, reportLocation === loc && s.optionTextActive]}>{loc}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Step 1: Crowd Level */}
            {reportStep === 1 && (
              <View>
                <Text style={s.modalTitle}>Crowd Level</Text>
                <Text style={s.modalSub}>How busy is {reportLocation}?</Text>
                {crowdOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[s.optionBtn, reportCrowd === opt && s.optionBtnActive]}
                    onPress={() => { setReportCrowd(opt); setReportStep(2); }}
                  >
                    <Text style={[s.optionText, reportCrowd === opt && s.optionTextActive]}>
                      {opt === "Low" ? "🟢" : opt === "Medium" ? "🟡" : "🔴"} {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={s.backBtn} onPress={() => setReportStep(0)}>
                  <Text style={s.backBtnText}>← Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 2: Noise Level */}
            {reportStep === 2 && (
              <View>
                <Text style={s.modalTitle}>Noise Level</Text>
                <Text style={s.modalSub}>How noisy is {reportLocation}?</Text>
                {noiseOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[s.optionBtn, reportNoise === opt && s.optionBtnActive]}
                    onPress={() => setReportNoise(opt)}
                  >
                    <Text style={[s.optionText, reportNoise === opt && s.optionTextActive]}>
                      {opt === "Quiet" ? "🤫" : opt === "Moderate" ? "🗣️" : "📢"} {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
                {reportNoise !== "" && (
                  <TouchableOpacity style={s.submitBtn} onPress={submitReport}>
                    <Text style={s.submitBtnText}>Submit Report</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.backBtn} onPress={() => setReportStep(1)}>
                  <Text style={s.backBtnText}>← Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Close */}
            <TouchableOpacity style={s.closeBtn} onPress={() => setFabOpen(false)}>
              <Text style={s.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: UTA.offWhite },
  container: { padding: 16, paddingTop: 48, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center", color: UTA.royalBlue },
  subtitle: { fontSize: 13, color: UTA.gray500, textAlign: "center", marginBottom: 14 },

  // Legend
  legend: { flexDirection: "row", justifyContent: "center", marginBottom: 10, gap: 14 },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 11, height: 11, borderRadius: 6, marginRight: 4 },
  legendText: { fontSize: 11, color: UTA.gray600 },

  // Filter
  filterRow: { flexDirection: "row", justifyContent: "center", marginBottom: 14, gap: 6 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: UTA.gray100, borderRadius: 20 },
  filterTabActive: { backgroundColor: UTA.royalBlue },
  filterText: { fontSize: 12, color: UTA.gray600, fontWeight: "600" },
  filterTextActive: { color: "#fff" },

  // Grid
  gridContainer: { marginBottom: 14 },
  gridRow: { flexDirection: "row", justifyContent: "center", marginBottom: 8, gap: 8 },
  gridCell: {
    width: 108, height: 92, borderRadius: 14, justifyContent: "center", alignItems: "center", padding: 6,
    shadowColor: "#000", shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2,
  },
  gridCellSelected: { borderWidth: 3, borderColor: UTA.royalBlue },
  cellShort: { fontSize: 17, fontWeight: "bold", color: "#fff", zIndex: 2 },
  cellLabel: { fontSize: 10, color: "#fff", fontWeight: "600", marginTop: 2, zIndex: 2 },
  cellReports: { fontSize: 9, color: "rgba(255,255,255,0.85)", marginTop: 1, zIndex: 2 },

  // Pulsing dot
  pulseWrapper: { position: "absolute", top: 6, right: 6, width: 14, height: 14, alignItems: "center", justifyContent: "center" },
  pulseRing: { position: "absolute", width: 14, height: 14, borderRadius: 7 },
  pulseDot: { width: 6, height: 6, borderRadius: 3 },

  // Detail
  detailCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 14,
    shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2,
  },
  detailTitle: { fontSize: 17, fontWeight: "bold", color: UTA.royalBlue, marginBottom: 10 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  detailKey: { fontSize: 13, color: UTA.gray500 },
  detailValue: { fontSize: 13, fontWeight: "bold" },
  detailNote: { fontSize: 12, color: UTA.gray400, fontStyle: "italic", marginTop: 6 },

  // Library floor toggle
  floorSection: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: UTA.gray100 },
  floorLabel: { fontSize: 13, fontWeight: "600", color: UTA.gray600, marginBottom: 6 },
  floorRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  floorBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: UTA.gray100,
    justifyContent: "center", alignItems: "center",
  },
  floorBtnActive: { backgroundColor: UTA.royalBlue },
  floorBtnText: { fontSize: 14, fontWeight: "bold", color: UTA.gray600 },
  floorBtnTextActive: { color: "#fff" },
  floorNote: { fontSize: 11, color: UTA.gray400, fontStyle: "italic" },

  // Summary
  summaryCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10, color: UTA.gray800 },
  summaryGrid: { flexDirection: "row", justifyContent: "space-around", marginBottom: 10 },
  summaryItem: { alignItems: "center" },
  summaryDot: { width: 14, height: 14, borderRadius: 7, marginBottom: 3 },
  summaryCount: { fontSize: 18, fontWeight: "bold", color: UTA.gray800 },
  summaryLabel: { fontSize: 10, color: UTA.gray400 },
  summaryNote: { fontSize: 11, color: UTA.gray400, textAlign: "center" },

  // Cooldown
  cooldownBanner: {
    marginTop: 12, backgroundColor: UTA.blazeOrange + "18", borderRadius: 10,
    padding: 12, borderLeftWidth: 4, borderLeftColor: UTA.blazeOrange,
  },
  cooldownText: { fontSize: 13, color: UTA.blazeOrange, fontWeight: "600" },

  // FAB
  fab: {
    position: "absolute", bottom: 28, right: 20,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: UTA.blazeOrange, justifyContent: "center", alignItems: "center",
    shadowColor: UTA.blazeOrange, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10, elevation: 6,
  },
  fabIcon: { fontSize: 32, color: "#fff", fontWeight: "bold", marginTop: -2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: "80%",
  },
  stepper: { flexDirection: "row", justifyContent: "center", gap: 24, marginBottom: 20 },
  stepItem: { alignItems: "center" },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: UTA.gray200,
    justifyContent: "center", alignItems: "center", marginBottom: 4,
  },
  stepCircleActive: { backgroundColor: UTA.royalBlue },
  stepNum: { fontSize: 14, fontWeight: "bold", color: UTA.gray400 },
  stepNumActive: { color: "#fff" },
  stepLabel: { fontSize: 11, color: UTA.gray400 },
  stepLabelActive: { color: UTA.royalBlue, fontWeight: "600" },

  modalTitle: { fontSize: 20, fontWeight: "bold", color: UTA.gray800, marginBottom: 6 },
  modalSub: { fontSize: 13, color: UTA.gray500, marginBottom: 14 },
  optionScroll: { maxHeight: 280 },
  optionBtn: {
    paddingVertical: 14, paddingHorizontal: 16, backgroundColor: UTA.gray100,
    borderRadius: 12, marginBottom: 8,
  },
  optionBtnActive: { backgroundColor: UTA.royalBlue },
  optionText: { fontSize: 15, color: UTA.gray800, fontWeight: "500" },
  optionTextActive: { color: "#fff" },

  submitBtn: {
    marginTop: 14, backgroundColor: UTA.blazeOrange, borderRadius: 12,
    paddingVertical: 14, alignItems: "center",
    shadowColor: UTA.blazeOrange, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 3 }, shadowRadius: 6, elevation: 3,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  backBtn: { marginTop: 10, paddingVertical: 6 },
  backBtnText: { color: UTA.royalBlue, fontSize: 14, fontWeight: "600" },
  closeBtn: { marginTop: 14, alignItems: "center", paddingVertical: 8 },
  closeBtnText: { color: UTA.gray400, fontSize: 14, fontWeight: "600" },
});
