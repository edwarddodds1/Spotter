import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Platform, ScrollView, Text, View, Pressable } from "react-native";

import { reportError } from "@/lib/errorReporter";
import { clearPersistedSpotterState } from "@/store/spotterPersistence";

type Props = { children: ReactNode };
type State = { error: Error | null; info: ErrorInfo | null };

/**
 * Last-resort UI shield: surfaces render-time errors so the app never silently
 * goes blank white. On web also dumps to console with a clear marker so the
 * error stays visible in the browser console.
 */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[RootErrorBoundary] Render crash:", error, info?.componentStack);
    reportError(error, {
      tags: { source: "RootErrorBoundary" },
      extra: { componentStack: info?.componentStack ?? "" },
    });
    this.setState({ error, info });
  }

  private copyErrorDetails = () => {
    const message = this.state.error?.message ?? "Unknown error";
    const stack = this.state.error?.stack ?? "";
    const componentStack = this.state.info?.componentStack ?? "";
    const payload = `Spotter crash:\n${message}\n\nStack:\n${stack}\n\nComponent stack:\n${componentStack}`;
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(payload);
      }
    } catch {
      /* clipboard unavailable */
    }
  };

  private clearAndReload = () => {
    try {
      clearPersistedSpotterState();
    } catch {
      /* noop */
    }
    try {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.reload();
        return;
      }
    } catch {
      /* noop */
    }
    this.setState({ error: null, info: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    const message = this.state.error?.message ?? String(this.state.error);
    const stack = this.state.error?.stack ?? "";
    const componentStack = this.state.info?.componentStack ?? "";

    return (
      <View style={{ flex: 1, backgroundColor: "#fff", padding: 20, paddingTop: 48 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#b91c1c", marginBottom: 8 }}>
          Something went wrong while loading Spotter
        </Text>
        <Text style={{ fontSize: 13, color: "#111827", marginBottom: 12 }}>{message}</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <Pressable
            onPress={this.clearAndReload}
            style={{
              backgroundColor: "#4a7c4a",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Reset and reload</Text>
          </Pressable>
          {Platform.OS === "web" ? (
            <Pressable
              onPress={this.copyErrorDetails}
              style={{
                backgroundColor: "#e5e7eb",
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#111827", fontWeight: "600" }}>Copy error details</Text>
            </Pressable>
          ) : null}
        </View>
        <ScrollView style={{ flex: 1 }}>
          {stack ? (
            <Text style={{ fontFamily: "monospace" as any, fontSize: 11, color: "#374151" }}>
              {stack}
            </Text>
          ) : null}
          {componentStack ? (
            <Text style={{ fontFamily: "monospace" as any, fontSize: 11, color: "#6b7280", marginTop: 12 }}>
              {componentStack}
            </Text>
          ) : null}
        </ScrollView>
      </View>
    );
  }
}
