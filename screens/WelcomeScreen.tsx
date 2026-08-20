import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Welcome: undefined;
  GetStarted: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>S</Text>
        </View>

        <Text style={styles.title}>Slick AI</Text>

        <Text style={styles.subtitle}>
          Intelligent trading.{"\n"}
          Automated decisions.{"\n"}
          Smarter execution.
        </Text>

        <Text style={styles.description}>
          Connect your trading account and let Slick AI
          manage your trading with intelligent AI-powered
          strategies.
        </Text>

        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("GetStarted")}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Powered by Slick AI</Text>
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
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#1A2238",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#34405F",
  },

  logo: {
    fontSize: 48,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  title: {
    fontSize: 42,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 18,
  },

  subtitle: {
    fontSize: 22,
    lineHeight: 32,
    fontWeight: "600",
    textAlign: "center",
    color: "#D7DCEF",
    marginBottom: 20,
  },

  description: {
    fontSize: 16,
    lineHeight: 25,
    textAlign: "center",
    color: "#929BB5",
    maxWidth: 350,
    marginBottom: 40,
  },

  button: {
    width: "100%",
    maxWidth: 340,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0B1020",
  },

  footer: {
    textAlign: "center",
    marginBottom: 25,
    color: "#606A83",
    fontSize: 13,
  },
});