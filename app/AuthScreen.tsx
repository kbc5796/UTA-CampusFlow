// app/AuthScreen.tsx
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { loginGuest, loginUTAEmail } from "../firebase/auth";
import { auth } from "../firebase/firebase";

type AuthScreenProps = {
  onAuthSuccess?: () => void; // optional callback
};

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState<any>(null);

  // Login with UTA email
  const handleLogin = async () => {
    if (!email.endsWith("@mavs.uta.edu")) {
      Alert.alert("Invalid Email", "Use your UTA email ending with @mavs.uta.edu");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await loginUTAEmail(email, password);
      const user = userCredential.user;

      await user.reload(); // refresh verification status

      if (!user.emailVerified) {
        setUnverifiedUser(user);
        Alert.alert(
          "Email not verified",
          "Please verify your UTA email before logging in. You can resend the verification link below."
        );
        return;
      }

      setUnverifiedUser(null);
      if (onAuthSuccess) onAuthSuccess();
      else router.replace("../app/index");
    } catch (err: any) {
      console.error(err);
      Alert.alert("Login Failed", err.message || "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Guest login
  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      const userCredential = await loginGuest();
      console.log("Logged in as guest:", userCredential.user.uid);

      if (onAuthSuccess) onAuthSuccess();
      else router.replace("../app/index");
    } catch (err: any) {
      console.error(err);
      Alert.alert("Login Failed", err.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  // Signup with UTA email
  const handleSignUp = async () => {
    if (!email.endsWith("@mavs.uta.edu")) {
      Alert.alert("Invalid Email", "Please use your UTA email ending with @mavs.uta.edu");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password should be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await sendEmailVerification(userCredential.user);
        Alert.alert(
          "Verify your email",
          "A verification link has been sent to your UTA email. Please verify before logging in."
        );
        setMode("login");
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert("Sign Up Failed", err.message || "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Forgot password
  const handleForgotPassword = async () => {
    if (!email.endsWith("@mavs.uta.edu")) {
      Alert.alert("Invalid Email", "Use your UTA email to reset password.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Email Sent", "Password reset email has been sent. Check your inbox.");
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err.message || "Failed to send password reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>CampusFlow</Text>
        <Text style={styles.subtitle}>Quick access to key campus info</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="UTA Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          {mode === "signup" && (
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          )}
        </View>

        {mode === "login" ? (
          <>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Login as UTA Student</Text>
            </TouchableOpacity>

            <Text style={styles.orText}>OR</Text>

            <TouchableOpacity
              style={[styles.button, styles.guestButton, loading && styles.buttonDisabled]}
              onPress={handleGuestLogin}
              disabled={loading}
            >
              <Text style={[styles.buttonText, styles.guestButtonText]}>
                Continue as Guest
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleForgotPassword} style={{ marginTop: 15 }}>
              <Text style={{ color: "#2563eb", fontWeight: "500" }}>
                Forgot Password?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode("signup")}
              style={{ marginTop: 15 }}
            >
              <Text style={{ color: "#2563eb", fontWeight: "500" }}>
                Create an account
              </Text>
            </TouchableOpacity>

            {unverifiedUser && (
              <TouchableOpacity
                onPress={async () => {
                  setLoading(true);
                  try {
                    await sendEmailVerification(unverifiedUser);
                    Alert.alert(
                      "Email Sent",
                      "Verification email resent. Check your inbox."
                    );
                  } catch (err: any) {
                    console.error(err);
                    Alert.alert("Error", err.message || "Failed to resend email.");
                  } finally {
                    setLoading(false);
                  }
                }}
                style={{ marginTop: 15 }}
              >
                <Text style={{ color: "#2563eb", fontWeight: "500" }}>
                  Resend Verification Email
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Sign Up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode("login")}
              style={{ marginTop: 15 }}
            >
              <Text style={{ color: "#2563eb", fontWeight: "500" }}>
                Back to Login
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  title: { fontSize: 36, fontWeight: "bold", color: "#2563eb", marginBottom: 10 },
  subtitle: { fontSize: 16, color: "#555", marginBottom: 30, textAlign: "center" },
  inputContainer: { width: "100%" },
  input: {
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  orText: { marginVertical: 15, color: "#888", fontWeight: "500" },
  guestButton: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#2563eb" },
  guestButtonText: { color: "#2563eb" },
});