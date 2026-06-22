import { View, Text, ActivityIndicator } from 'react-native';
import { Button } from '@/shared/ui/Button';

type Props = {
  branchName: string;
  isLoading: boolean;
  onUseDemoDataset: () => void;
};

export const ImportUploadStep = ({ branchName, isLoading, onUseDemoDataset }: Props) => {
  return (
    <View className="flex-1 px-4 pt-6">
      <View className="bg-teal-50 rounded-xl border border-teal-200 p-4 mb-6">
        <Text className="text-teal-800 font-semibold text-base mb-1">
          Импорт товаров из Excel
        </Text>
        <Text className="text-teal-700 text-sm">
          Импорт применяется к текущему филиалу:
        </Text>
        <Text className="text-teal-900 font-bold text-sm mt-1">{branchName}</Text>
      </View>

      <View className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center self-center mb-4">
          <Text className="text-3xl text-gray-400">{'\u2191'}</Text>
        </View>
        <Text className="text-base text-gray-700 text-center mb-2">
          Загрузите файл Excel (.xlsx) с товарами
        </Text>
        <Text className="text-sm text-gray-400 text-center mb-6">
          Колонки будут автоматически сопоставлены. Вы сможете изменить сопоставление перед импортом.
        </Text>

        <View className="flex-row justify-center gap-3">
          <View className="flex-1 max-w-xs">
            <Button
              title="Выбрать файл"
              onPress={() => {}}
              variant="secondary"
              disabled
            />
            <Text className="text-xs text-gray-400 text-center mt-1">
              Загрузка файлов будет доступна при подключении бэкенда
            </Text>
          </View>
        </View>
      </View>

      <View className="mb-4">
        <View className="flex-row items-center mb-3">
          <View className="flex-1 h-px bg-gray-200" />
          <Text className="text-sm text-gray-400 mx-3">или</Text>
          <View className="flex-1 h-px bg-gray-200" />
        </View>

        <Button
          title="Использовать пример Excel"
          onPress={onUseDemoDataset}
          variant="primary"
          size="lg"
          loading={isLoading}
        />
        <Text className="text-xs text-gray-400 text-center mt-2">
          Демо-набор: спортивное питание, 3 товара
        </Text>
      </View>
    </View>
  );
};
