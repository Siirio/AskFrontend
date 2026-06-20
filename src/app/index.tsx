import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

export const App = () => {
  return (
    <View className="flex-1 bg-white items-center justify-center">
      <Text className="text-teal-600 font-bold text-xl">Ask Frontend</Text>
      <Text className="text-gray-500 mt-2">Search-First Platform</Text>
      <StatusBar style="auto" />
    </View>
  );
};
