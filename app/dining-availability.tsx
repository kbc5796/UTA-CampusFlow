import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Helper: parse time like "10:30a - 8:00p" to minutes
function parseTime(timeStr: string) {
  const [start, end] = timeStr.split(" - ");
  const parse = (t: string) => {
    let [hour, min] = t.slice(0, -1).split(":").map(Number);
    if (t.endsWith("p") && hour !== 12) hour += 12;
    if (t.endsWith("a") && hour === 12) hour = 0;
    return hour * 60 + (min || 0);
  };
  return [parse(start), parse(end)];
}

// Helper: check if now is within hours
function isOpen(hoursArr: string[]) {
  const now = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = dayNames[now.getDay()];

  const todayHours = hoursArr.find((h) => h.startsWith(today));
  if (!todayHours || todayHours.toLowerCase().includes("closed")) return false;

  const timeRange = todayHours.split(": ")[1]; // "10:30a - 8:00p"
  if (!timeRange) return false;

  const [startMin, endMin] = parseTime(timeRange);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= startMin && nowMin <= endMin;
}

// Full dining data
const diningLocations = [
  {
    building: "E.H. Hereford University Center",
    locations: [
      {
        name: "The Pit Stop",
        hours: [
          "Sun: Closed",
          "Mon: 10:30a - 8:00p",
          "Tue: 10:30a - 8:00p",
          "Wed: 10:30a - 8:00p",
          "Thu: 10:30a - 8:00p",
          "Fri: 10:30a - 5:00p",
          "Sat: Closed",
        ],
      },
      {
        name: "Connection Cafe",
        hours: [
          "Sun: 11:00a - 2:00p, 5:00p - 8:30p",
          "Mon: 7:00a - 10:00p",
          "Tue: 7:00a - 10:00p",
          "Wed: 7:00a - 10:00p",
          "Thu: 7:00a - 10:00p",
          "Fri: 7:00a - 10:00p",
          "Sat: 7:00a - 8:30p",
        ],
      },
      {
        name: "Starbucks at University Center",
        hours: [
          "Sun: Closed",
          "Mon: 7:00a - 7:00p",
          "Tue: 7:00a - 7:00p",
          "Wed: 7:00a - 7:00p",
          "Thu: 7:00a - 7:00p",
          "Fri: 7:00a - 5:00p",
          "Sat: 10:00a - 2:00p",
        ],
      },
      {
        name: "Subway",
        hours: [
          "Sun: Closed",
          "Mon: 10:30a - 8:00p",
          "Tue: 10:30a - 8:00p",
          "Wed: 10:30a - 8:00p",
          "Thu: 10:30a - 8:00p",
          "Fri: 10:30a - 3:00p",
          "Sat: Closed",
        ],
      },
      {
        name: "Chick-fil-A",
        hours: [
          "Sun: Closed",
          "Mon: 7:00a - 10:00p",
          "Tue: 7:00a - 10:00p",
          "Wed: 7:00a - 10:00p",
          "Thu: 7:00a - 10:00p",
          "Fri: 7:00a - 5:00p",
          "Sat: 11:00a - 3:00p",
        ],
      },
      {
        name: "Panda Express",
        hours: [
          "Sun: 5:00p - 8:30p",
          "Mon: 10:30a - 8:00p",
          "Tue: 10:30a - 8:00p",
          "Wed: 10:30a - 8:00p",
          "Thu: 10:30a - 8:00p",
          "Fri: 10:30a - 5:00p",
          "Sat: Closed",
        ],
      },
      {
        name: "Market at University Center",
        hours: [
          "Sun: 11:00a - 8:00p",
          "Mon: 7:00a - 12:00a",
          "Tue: 7:00a - 12:00a",
          "Wed: 7:00a - 12:00a",
          "Thu: 7:00a - 12:00a",
          "Fri: 7:00a - 8:00p",
          "Sat: 9:00a - 5:00p",
        ],
      },
      {
        name: "O'Desi aroma at the University Center Market",
        hours: [
          "Sun: Closed",
          "Mon: 11:00a - 8:00p",
          "Tue: 11:00a - 8:00p",
          "Wed: 11:00a - 8:00p",
          "Thu: 11:00a - 8:00p",
          "Fri: 11:00a - 8:00p",
          "Sat: Closed",
        ],
      },
      {
        name: "TEA Co.",
        hours: [
          "Sun: Closed",
          "Mon: 9:00a - 4:00p",
          "Tue: 9:00a - 4:00p",
          "Wed: 9:00a - 4:00p",
          "Thu: 9:00a - 4:00p",
          "Fri: 9:00a - 3:00p",
          "Sat: Closed",
        ],
      },
      {
        name: "Sushic",
        hours: [
          "Sun: Closed",
          "Mon: 9:00a - 4:00p",
          "Tue: 9:00a - 4:00p",
          "Wed: 9:00a - 4:00p",
          "Thu: 9:00a - 4:00p",
          "Fri: 9:00a - 3:00p",
          "Sat: Closed",
        ],
      },
    ],
  },
  {
    building: "Commons",
    locations: [
      {
        name: "Maverick Cafe'",
        hours: [
          "Sun: 11:00a - 2:00p, 5:00p - 8:30p",
          "Mon: 7:00a - 9:00a, 11:00a - 2:00p, 5:00p - 10:00p",
          "Tue: 7:00a - 9:00a, 11:00a - 2:00p, 5:00p - 10:00p",
          "Wed: 7:00a - 9:00a, 11:00a - 2:00p, 5:00p - 10:00p",
          "Thu: 7:00a - 9:00a, 11:00a - 2:00p, 5:00p - 10:00p",
          "Fri: 7:00a - 9:00a, 11:00a - 2:00p, 5:00p - 8:30p",
          "Sat: 11:00a - 2:00p, 5:00p - 8:30p",
        ],
      },
      {
        name: "Starbucks at The Commons",
        hours: [
          "Sun: Closed",
          "Mon: 7:00a - 7:00p",
          "Tue: 7:00a - 7:00p",
          "Wed: 7:00a - 7:00p",
          "Thu: 7:00a - 7:00p",
          "Fri: 7:00a - 5:00p",
          "Sat: 10:00a - 2:00p",
        ],
      },
    ],
  },
  {
    building: "College of Business (COBA)",
    locations: [
      {
        name: "The Exchange Market",
        hours: [
          "Sun: Closed",
          "Mon: 8:00a - 8:00p",
          "Tue: 8:00a - 8:00p",
          "Wed: 8:00a - 8:00p",
          "Thu: 8:00a - 8:00p",
          "Fri: 8:00a - 3:00p",
          "Sat: Closed",
        ],
      },
    ],
  },
  {
    building: "Maverick Activity Center",
    locations: [
      {
        name: "Shake Smart",
        hours: [
          "Sun: Closed",
          "Mon: 9:00a - 10:00p",
          "Tue: 9:00a - 10:00p",
          "Wed: 9:00a - 10:00p",
          "Thu: 9:00a - 10:00p",
          "Fri: 9:00a - 8:00p",
          "Sat: Closed",
        ],
      },
    ],
  },
  {
    building: "SSW & CONHI",
    locations: [
      {
        name: "Social Grounds",
        hours: [
          "Sun: Closed",
          "Mon: 8:00a - 3:00p",
          "Tue: 8:00a - 3:00p",
          "Wed: 8:00a - 3:00p",
          "Thu: 8:00a - 3:00p",
          "Fri: 8:00a - 3:00p",
          "Sat: Closed",
        ],
      },
    ],
  },
  {
    building: "Central Library",
    locations: [
      {
        name: "Einstein Bros. Bagels",
        hours: [
          "Sun: Closed",
          "Mon: 8:00a - 3:00p",
          "Tue: 8:00a - 3:00p",
          "Wed: 8:00a - 3:00p",
          "Thu: 8:00a - 3:00p",
          "Fri: 8:00a - 3:00p",
          "Sat: Closed",
        ],
      },
      {
        name: "Market at Central Library",
        hours: [
          "Sun: 3:00p - 11:00p",
          "Mon: 11:00a - 11:00p",
          "Tue: 11:00a - 11:00p",
          "Wed: 11:00a - 11:00p",
          "Thu: 11:00a - 11:00p",
          "Fri: 11:00a - 5:00p",
          "Sat: Closed",
        ],
      },
    ],
  },
  {
    building: "Fine Arts Building",
    locations: [
      {
        name: "Fine Arts Market",
        hours: [
          "Sun: Closed",
          "Mon: 8:00a - 6:00p",
          "Tue: 8:00a - 6:00p",
          "Wed: 8:00a - 6:00p",
          "Thu: 8:00a - 6:00p",
          "Fri: 8:00a - 3:00p",
          "Sat: Closed",
        ],
      },
    ],
  },
  {
    building: "SEIR Building",
    locations: [
      {
        name: "Inclusion Coffee Express",
        hours: [
          "Sun: Closed",
          "Mon: 7:30a - 6:00p",
          "Tue: 7:30a - 6:00p",
          "Wed: 7:30a - 6:00p",
          "Thu: 7:30a - 6:00p",
          "Fri: 7:30a - 3:00p",
          "Sat: Closed",
        ],
      },
    ],
  },
  {
    building: "College Park District",
    locations: [
      {
        name: "Panera Bread",
        hours: [
          "Sun: 11:00a - 8:00p",
          "Mon: 11:00a - 8:00p",
          "Tue: 11:00a - 8:00p",
          "Wed: 11:00a - 8:00p",
          "Thu: 11:00a - 8:00p",
          "Fri: 11:00a - 8:00p",
          "Sat: 11:00a - 8:00p",
        ],
      },
    ],
  },
  {
    building: "University Administration Building (UAB)",
    locations: [
      {
        name: "The University Club",
        hours: [
          "Sun: Closed",
          "Mon: 11:00a - 2:00p",
          "Tue: 11:00a - 2:00p",
          "Wed: 11:00a - 2:00p",
          "Thu: 11:00a - 2:00p",
          "Fri: 11:00a - 2:00p",
          "Sat: Closed",
        ],
      },
    ],
  },
];

export default function DiningAvailabilityScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Back button */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButton}>← Back to Home</Text>
            </TouchableOpacity>
      <Text style={[styles.title, { marginTop: 20 }]}>Dining Availability</Text>

      {diningLocations.map((building, bIndex) => (
        <View key={bIndex} style={styles.buildingSection}>
          <Text style={styles.buildingName}>{building.building}</Text>

          {building.locations.map((location, lIndex) => {
            const open = isOpen(location.hours);
            return (
              <View
                key={lIndex}
                style={[
                  styles.card,
                  { borderLeftColor: open ? "green" : "red", borderLeftWidth: 5 },
                ]}
              >
                <Text style={styles.locationName}>
                  {location.name} {open ? "(Open Now)" : "(Closed)"}
                </Text>
                {location.hours.map((hour, hIndex) => (
                  <Text key={hIndex} style={styles.hoursText}>
                    {hour}
                  </Text>
                ))}
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#f4f6f8",
  },
  backButton: {
    fontSize: 16,
    color: "#2563eb",
    fontWeight: "bold",
  },
  backText: {
    fontSize: 16,
    color: "#2563eb",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  buildingSection: {
    marginBottom: 25,
  },
  buildingName: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  locationName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  hoursText: {
    fontSize: 14,
    color: "#555",
    marginLeft: 5,
    marginBottom: 2,
  },
});
