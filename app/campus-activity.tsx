import { useRouter } from "expo-router";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { db } from "../firebase/firebase";

export default function CampusActivityScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "campusReports"), orderBy("createdAt", "desc"), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReports(reportsData);
    });

    return () => unsubscribe();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.push("/")}>
        <Text style={styles.backButtonText}>← Back to Home</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Recent Campus Activity</Text>

      {reports.length === 0 ? (
        <Text style={styles.noReports}>No recent reports. Be the first to report!</Text>
      ) : (
        reports.map((report) => (
          <View key={report.id} style={styles.reportCard}>
            <Text style={styles.location}>{report.location}</Text>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Noise:</Text>
              <Text style={styles.value}>{report.noiseLevel}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Crowd:</Text>
              <Text style={styles.value}>{report.crowdLevel}</Text>
            </View>
            <Text style={styles.time}>
              {report.createdAt?.toDate() ? new Date(report.createdAt.toDate()).toLocaleTimeString() : "Just now"}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f4f6f8",
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: "#2563eb",
    fontWeight: "bold",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  noReports: {
    textAlign: "center",
    color: "#888",
    marginTop: 20,
  },
  reportCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  location: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    fontWeight: "600",
    width: 60,
    color: "#555",
  },
  value: {
    color: "#333",
  },
  time: {
    marginTop: 10,
    fontSize: 12,
    color: "#999",
    textAlign: "right",
  },
});
