import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";

export default function GetStartedScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>S</Text>
        </View>

        <Text style={styles.title}>
          Welcome to Slick AI
        </Text>

        <Text style={styles.description}>
          Your AI-powered trading journey starts here.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.8}
          onPress={() => console.log("Create Account")}
        >
          <Text style={styles.primaryButtonText}>
            Create Account
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.8}
          onPress={() => console.log("Login")}
        >
          <Text style={styles.secondaryButtonText}>
            I already have an account
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1020",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  logoContainer: {
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: "#1A2238",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#34405F",
  },

  logo: {
    fontSize: 40,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 15,
  },

  description: {
    fontSize: 16,
    color: "#929BB5",
    textAlign: "center",
    lineHeight: 25,
    marginBottom: 40,
  },

  primaryButton: {
    width: "100%",
    height: 56,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },

  primaryButtonText: {
    color: "#0B1020",
    fontSize: 16,
    fontWeight: "700",
  },

  secondaryButton: {
    width: "100%",
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#34405F",
    justifyContent: "center",
    alignItems: "center",
  },

  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});