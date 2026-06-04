import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  REPORT_REASON_LABELS,
  type ReportReason,
} from "@/lib/supabase/moderationRemote";

const REASON_ORDER: ReportReason[] = [
  "spam",
  "nudity_or_sexual",
  "hate_or_harassment",
  "violence_or_dangerous",
  "other",
];

/**
 * Subtle bottom-sheet for content moderation. Surfaces the App Store
 * guideline 1.2 essentials — report objectionable content and block a user —
 * without dominating the UI. Triggered from a small overflow control.
 */
export function ContentActionSheet({
  visible,
  onClose,
  subjectLabel,
  showBlock = true,
  isBlocked = false,
  busy = false,
  onReport,
  onToggleBlock,
}: {
  visible: boolean;
  onClose: () => void;
  /** What's being acted on, e.g. "this post" or a username. */
  subjectLabel: string;
  showBlock?: boolean;
  isBlocked?: boolean;
  busy?: boolean;
  onReport: (reason: ReportReason) => void;
  onToggleBlock?: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="rounded-t-3xl bg-white px-4 pb-8 pt-3 dark:bg-card"
        >
          <View className="mb-2 items-center">
            <View className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          </View>

          <Text className="px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Report {subjectLabel}
          </Text>
          <ScrollView className="max-h-72">
            {REASON_ORDER.map((reason) => (
              <Pressable
                key={reason}
                disabled={busy}
                onPress={() => onReport(reason)}
                className="flex-row items-center gap-3 rounded-2xl px-3 py-3 active:bg-zinc-100 disabled:opacity-50 dark:active:bg-zinc-800"
              >
                <MaterialCommunityIcons name="flag-outline" size={18} color="#71717a" />
                <Text className="text-[15px] text-black dark:text-white">
                  {REPORT_REASON_LABELS[reason]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {showBlock && onToggleBlock ? (
            <>
              <View className="my-2 h-px bg-zinc-100 dark:bg-zinc-800" />
              <Pressable
                disabled={busy}
                onPress={onToggleBlock}
                className="flex-row items-center gap-3 rounded-2xl px-3 py-3 active:bg-zinc-100 disabled:opacity-50 dark:active:bg-zinc-800"
              >
                <MaterialCommunityIcons
                  name={isBlocked ? "account-check-outline" : "account-cancel-outline"}
                  size={18}
                  color={isBlocked ? "#16a34a" : "#dc2626"}
                />
                <Text
                  className={`text-[15px] font-semibold ${
                    isBlocked ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {isBlocked ? `Unblock ${subjectLabel}` : `Block ${subjectLabel}`}
                </Text>
              </Pressable>
            </>
          ) : null}

          <View className="my-2 h-px bg-zinc-100 dark:bg-zinc-800" />
          <Pressable onPress={onClose} className="items-center rounded-2xl px-3 py-3 active:bg-zinc-100 dark:active:bg-zinc-800">
            <Text className="text-[15px] font-semibold text-zinc-600 dark:text-zinc-300">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
