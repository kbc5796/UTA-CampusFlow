import React, { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
// Modular imports from Firebase
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/firebase";

export default function SurveyScreen() {
  const [location, setLocation] = useState("");
  const [noiseLevel, setNoiseLevel] = useState("");
  const [crowdLevel, setCrowdLevel] = useState("");

  const handleSubmit = async () => {
    // simple validation
    if (!location || !noiseLevel || !crowdLevel) {
      Alert.alert("Please fill in all fields");
      return;
    }

    try {
      // Add report to Firestore
      await addDoc(collection(db, "campusReports"), {
        location,
        noiseLevel,
        crowdLevel,
        createdAt: serverTimestamp(), // automatically sets the timestamp
      });
      Alert.alert("Report submitted!");

      // clear the input fields
      setLocation("");
      setNoiseLevel("");
      setCrowdLevel("");
    } catch (error) {
      console.error("Error adding document: ", error);
      Alert.alert("Failed to submit report");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Campus Activity Survey</Text>

      <TextInput
        style={styles.input}
        placeholder="Location (e.g., Library Floor 2)"
        value={location}
        onChangeText={setLocation}
      />
      <TextInput
        style={styles.input}
        placeholder="Noise Level (Quiet, Moderate, Social)"
        value={noiseLevel}
        onChangeText={setNoiseLevel}
      />
      <TextInput
        style={styles.input}
        placeholder="Crowd Level (Low, Medium, High)"
        value={crowdLevel}
        onChangeText={setCrowdLevel}
      />

      <Button title="Submit Report" onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f4f6f8",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
});
