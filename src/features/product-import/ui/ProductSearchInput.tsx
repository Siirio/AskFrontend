import { View, TextInput, TouchableOpacity, Text } from 'react-native';

type Props = {
  value: string;
  onChange: (text: string) => void;
};

export const ProductSearchInput = ({ value, onChange }: Props) => {
  return (
    <View className="px-4 py-3 border-b border-gray-200 bg-white">
      <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2.5">
        <TextInput
          value={value}
          onChangeText={onChange}
          className="flex-1 text-sm text-gray-900"
          placeholder="Поиск по названию, категории, описанию, SKU, тегам, характеристикам..."
          placeholderTextColor="#9ca3af"
        />
        {value.length > 0 ? (
          <TouchableOpacity
            onPress={() => onChange('')}
            className="ml-2 bg-gray-300 w-5 h-5 rounded-full items-center justify-center"
          >
            <Text className="text-xs text-white font-bold">{'\u2715'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};
