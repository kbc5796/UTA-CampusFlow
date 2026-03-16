import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const busRoutes = [
  { name: "Express Route", hours: "7:30 AM - 6:00 PM Monday-Friday", color: "#FF5733", stops: ["Lot27/Studio Arts","Arbor Oaks","Greek Row Parking Lot","University Center","MAC","P.E. Building","Greek Row (Arbor Oaks/Meadow Run)"] },
  { name: "Orange Route", hours: "7:30 AM - 6:00 PM Monday-Friday", color: "#FFA500", stops: ["Lot 27/Studio Arts","Lot 26/Maverick Stadium","Maverick Place","848 Mitchell","Centennial Court","Pickard Hall","College of Business","Smart Hospital","Greek Row (Arbor Oaks/Meadow Run)"] },
  { name: "Blue Route", hours: "7:30 AM - 6:00 PM Monday-Friday", color: "#1E90FF", stops: ["University Center","MAC","Greek Row (Arbor Oaks/Meadow Run)","Meadow Run","Swift Center","Timber Brook","The Arlie"] },
  { name: "Black Route", hours: "7:30 AM - 6:00 PM Monday-Friday", color: "#000000", stops: ["Lot 53","Lot 52","Lot 50","Heights on Pecan","College of Business"] },
  { name: "Yellow Route", hours: "7:30 AM - 6:00 PM Monday-Friday", color: "#FFD700", stops: ["Liv+","Mesquite/1st Street*","University Center","Arlington Hall/CPC","College of Business"] },
  { name: "Extended Red Route", hours: "7:30 AM - 7:00 PM Monday-Friday", color: "#FF0000", stops: ["Maverick Place","848 Mitchell","Centennial Court","Lot 49","Lot 50","Heights on Pecan/Lot 56","Livplus","Business Building","College Park Center","UC","Social Work","Arli","Timber Brook","MAC","Greek Row","Studio Arts","UC"] },
  { name: "Green Shopping Route", hours: "5:30 PM - 9:00 PM Monday-Friday", color: "#008000", stops: ["UTA","Walmart"], notes: "Departs UTA every :00 and :30, departs Walmart every :15 and :45 minutes" },
];

export default function BusTrackerScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.push("/")}>
        <Text style={styles.backButtonText}>← Back to Home</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Campus Bus Tracker</Text>

      {busRoutes.map((route, index) => (
        <View key={index} style={styles.routeCard}>
          {/* Route color bar */}
          <View style={[styles.colorBar, { backgroundColor: route.color }]} />
          <Text style={styles.routeName}>{route.name}</Text>
          <Text style={styles.hours}>{route.hours}</Text>
          <Text style={styles.stopsLabel}>Stops:</Text>
          {route.stops.map((stop, i) => (
            <Text key={i} style={styles.stop}>• {stop}</Text>
          ))}
          {route.notes && <Text style={styles.notes}>Note: {route.notes}</Text>}
        </View>
      ))}
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
  routeCard: {
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
  colorBar: {
    height: 6,
    width: "100%",
    borderRadius: 3,
    marginBottom: 10,
  },
  routeName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  hours: {
    fontSize: 14,
    color: "#555",
    marginBottom: 10,
  },
  stopsLabel: {
    fontWeight: "bold",
    marginBottom: 5,
  },
  stop: {
    fontSize: 14,
    marginLeft: 10,
    marginBottom: 2,
  },
  notes: {
    marginTop: 10,
    fontStyle: "italic",
    color: "#555",
  },
});
