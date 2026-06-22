import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

type ToastType = 'success' | 'error' | 'warning';

type ToastData = {
  id: string;
  message: string;
  type: ToastType;
};

let toastListeners: ((toast: ToastData | null) => void)[] = [];
let activeToast: ToastData | null = null;

const notify = () => {
  toastListeners.forEach((fn) => fn(activeToast));
};

export const showToast = (message: string, type: ToastType = 'success') => {
  activeToast = { id: Date.now().toString(), message, type };
  notify();
  setTimeout(() => {
    activeToast = null;
    notify();
  }, 3500);
};

const bgClasses: Record<ToastType, string> = {
  success: 'bg-teal-600',
  error: 'bg-red-600',
  warning: 'bg-amber-500',
};

export const ToastContainer = () => {
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    const handler = (t: ToastData | null) => setToast(t);
    toastListeners.push(handler);
    return () => {
      toastListeners = toastListeners.filter((h) => h !== handler);
    };
  }, []);

  const dismiss = useCallback(() => {
    activeToast = null;
    setToast(null);
  }, []);

  if (!toast) return null;

  return (
    <View className="absolute top-12 left-4 right-4 z-50 items-center">
      <TouchableOpacity
        onPress={dismiss}
        className={`rounded-xl px-5 py-3 shadow-lg ${bgClasses[toast.type]}`}
      >
        <Text className="text-white font-medium text-center text-base">
          {toast.message}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
