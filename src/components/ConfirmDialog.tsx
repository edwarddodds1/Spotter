import { Modal, Pressable, Text, View } from "react-native";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable className="flex-1 items-center justify-center bg-black/50 px-6" onPress={onCancel}>
        <Pressable
          className="w-full max-w-sm rounded-3xl bg-white p-5 dark:bg-card"
          onPress={(e) => e.stopPropagation()}
        >
          <Text className="text-lg font-bold text-black dark:text-white">{title}</Text>
          <Text className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{message}</Text>
          <View className="mt-5 flex-row gap-2">
            <Pressable
              onPress={onCancel}
              className="flex-1 items-center rounded-2xl border border-zinc-200 py-3 dark:border-border"
            >
              <Text className="font-semibold text-zinc-700 dark:text-zinc-300">{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              className={`flex-1 items-center rounded-2xl py-3 ${destructive ? "bg-red-600" : "bg-amber"}`}
            >
              <Text className="font-semibold text-white">{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
