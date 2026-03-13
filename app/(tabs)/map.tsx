import React from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

const UTA_REGION = {
  latitude: 32.7292,
  longitude: -97.115,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

const campusLocations = [
  {
    id: 1,
    title: "University Center (UC)",
    description: "Hub for dining, events, and student organizations.",
    coordinate: { latitude: 32.7303, longitude: -97.1122 },
  },
  {
    id: 2,
    title: "Central Library",
    description: "Main campus library and study space.",
    coordinate: { latitude: 32.7291, longitude: -97.1143 },
  },
  {
    id: 3,
    title: "Maverick Activity Center (MAC)",
    description: "Campus recreation and fitness center.",
    coordinate: { latitude: 32.7335, longitude: -97.1147 },
  },
  {
    id: 4,
    title: "The Commons",
    description: "Dining hall and student gathering space.",
    coordinate: { latitude: 32.73, longitude: -97.1165 },
  },
  {
    id: 5,
    title: "Planetarium",
    description: "State-of-the-art planetarium at UTA.",
    coordinate: { latitude: 32.7305, longitude: -97.1135 },
  },
];

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={UTA_REGION}
        provider={PROVIDER_GOOGLE}
      >
        {campusLocations.map((location) => (
          <Marker
            key={location.id}
            coordinate={location.coordinate}
            title={location.title}
            description={location.description}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
