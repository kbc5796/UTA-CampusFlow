import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>UTA CampusFlow</Text>
      <Text style={styles.subtitle}>Quick access to key campus info</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/campus-activity")}
      >
        <Text style={styles.buttonText}>Campus Activity</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/library-noise")}
      >
        <Text style={styles.buttonText}>Library Noise Levels</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/dining-availability")}
      >
        <Text style={styles.buttonText}>Dining Availability</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/fitness-center")}
      >
        <Text style={styles.buttonText}>MAC Fitness Center</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/bus-tracker")}
      >
        <Text style={styles.buttonText}>Campus Bus Tracker</Text>
      </TouchableOpacity>

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
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    marginBottom: 30,
    textAlign: "center",
  },
  button: {
    width: 300,
    height: 60,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginBottom: 15,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
