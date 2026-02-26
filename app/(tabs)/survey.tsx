import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import React, { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import { auth, db } from "../../firebase/firebase";

export default function SurveyScreen() {
  const [location, setLocation] = useState("");
  const [noiseLevel, setNoiseLevel] = useState("");
  const [crowdLevel, setCrowdLevel] = useState("");

  const user = auth.currentUser;
  const isGuest = user?.isAnonymous;

  const handleSubmit = async () => {
    if (isGuest) {
      Alert.alert("Only registered users can submit surveys.");
      return;
    }

    if (!location || !noiseLevel || !crowdLevel) {
      Alert.alert("Please fill in all fields");
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      let lastReportTime: Date | null = null;

      if (userSnap.exists()) {
        const data = userSnap.data();
        lastReportTime = data.lastReportTime?.toDate() || null;
      } else {
        await setDoc(userRef, { points: 0, lastReportTime: null });
      }

      const now = new Date();

      if (lastReportTime && now.getTime() - lastReportTime.getTime() < 30 * 60 * 1000) {
        const minutesLeft = Math.ceil((30 * 60 * 1000 - (now.getTime() - lastReportTime.getTime())) / 60000);
        Alert.alert(`Please wait ${minutesLeft} more minutes before submitting again.`);
        return;
      }

      await addDoc(collection(db, "campusReports"), {
        location,
        noiseLevel,
        crowdLevel,
        createdAt: serverTimestamp(),
        userId: user.uid,
      });

      await updateDoc(userRef, { lastReportTime: serverTimestamp(), points: userSnap.data()?.points + 10 });

      Alert.alert("Report submitted! You earned 10 points 🎉");

      setLocation("");
      setNoiseLevel("");
      setCrowdLevel("");
    } catch (error) {
      console.error("Error submitting report:", error);
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

      <View style={{ marginTop: 10 }}>
        <Button
          title="Submit Report"
          onPress={handleSubmit}
          disabled={isGuest}
          color={isGuest ? "#999" : "#2563eb"} // grayed out if guest
        />
      </View>

      {isGuest && <Text style={styles.note}>Only registered users can submit surveys.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#f4f6f8" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: { height: 50, borderColor: "#ccc", borderWidth: 1, borderRadius: 8, marginBottom: 15, paddingHorizontal: 10, backgroundColor: "#fff" },
  note: { marginTop: 10, textAlign: "center", color: "#555", fontStyle: "italic" },
});