import { View, Text, TouchableOpacity } from 'react-native';
import type { Product } from '../model/types';
import { formatPrice } from '@/shared/lib/format';

type Props = {
  product: Product;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
};

export const ProductRow = ({ product, onEdit, onToggle, onDelete }: Props) => {
  const charPairs = Object.entries(product.characteristicsJson);

  return (
    <View
      className={`border-b border-gray-100 px-4 py-3 ${
        product.enabled ? 'bg-white' : 'bg-gray-50'
      }`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text
            className={`text-base font-semibold ${
              product.enabled ? 'text-gray-900' : 'text-gray-400'
            }`}
          >
            {product.name}
          </Text>

          <View className="flex-row flex-wrap items-center gap-2 mt-1">
            {product.categoryLabel ? (
              <View className="bg-teal-50 px-2 py-0.5 rounded-full">
                <Text className="text-xs text-teal-700">{product.categoryLabel}</Text>
              </View>
            ) : null}
            {product.sku ? (
              <Text className="text-xs text-gray-400">SKU: {product.sku}</Text>
            ) : null}
          </View>

          {product.description ? (
            <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>
              {product.description}
            </Text>
          ) : null}

          {product.tags.length > 0 ? (
            <View className="flex-row flex-wrap gap-1 mt-1">
              {product.tags.map((tag) => (
                <View key={tag} className="bg-gray-100 px-1.5 py-0.5 rounded">
                  <Text className="text-xs text-gray-500">{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {charPairs.length > 0 ? (
            <View className="flex-row flex-wrap gap-x-2 gap-y-0.5 mt-1">
              {charPairs.map(([k, v]) => (
                <Text key={k} className="text-xs text-gray-400">
                  {k}: <Text className="text-gray-600">{v}</Text>
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <View className="items-end">
          <Text
            className={`text-base font-bold ${
              product.enabled ? 'text-gray-900' : 'text-gray-400'
            }`}
          >
            {product.price != null ? formatPrice(product.price) : ''}
          </Text>
          {!product.enabled ? (
            <View className="bg-gray-200 px-2 py-0.5 rounded-full mt-1">
              <Text className="text-xs text-gray-500">Выключен</Text>
            </View>
          ) : null}
          <Text className="text-xs text-gray-400 mt-1">
            {product.sourceType === 'IMPORT' ? 'Импорт' : 'Вручную'}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2 mt-2 pt-2 border-t border-gray-50">
        <TouchableOpacity onPress={onEdit} className="flex-row items-center">
          <Text className="text-sm text-teal-600 font-medium">Редактировать</Text>
        </TouchableOpacity>
        <Text className="text-gray-300">|</Text>
        <TouchableOpacity onPress={onToggle}>
          <Text className={`text-sm font-medium ${product.enabled ? 'text-amber-600' : 'text-teal-600'}`}>
            {product.enabled ? 'Выключить' : 'Включить'}
          </Text>
        </TouchableOpacity>
        <Text className="text-gray-300">|</Text>
        <TouchableOpacity onPress={onDelete}>
          <Text className="text-sm text-red-500 font-medium">Удалить</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
