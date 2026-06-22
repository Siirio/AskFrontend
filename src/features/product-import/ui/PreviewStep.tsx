import { View, Text, ScrollView } from 'react-native';
import { Button } from '@/shared/ui/Button';
import type { ImportRow } from '../model/types';

type Props = {
  previewRows: ImportRow[];
  ignoredColumns: string[];
  appendToDescColumns: string[];
  characteristicColumns: { source: string; name: string }[];
  validCount: number;
  invalidCount: number;
  warningCount: number;
  isLoading: boolean;
  onBack: () => void;
  onApprove: () => void;
};

const statusBadge = (status: ImportRow['status']) => {
  switch (status) {
    case 'VALID':
      return (
        <View className="bg-teal-100 px-2 py-0.5 rounded-full">
          <Text className="text-xs text-teal-700 font-medium">ОК</Text>
        </View>
      );
    case 'WARNING':
      return (
        <View className="bg-amber-100 px-2 py-0.5 rounded-full">
          <Text className="text-xs text-amber-700 font-medium">Предупр.</Text>
        </View>
      );
    case 'INVALID':
      return (
        <View className="bg-red-100 px-2 py-0.5 rounded-full">
          <Text className="text-xs text-red-700 font-medium">Ошибка</Text>
        </View>
      );
  }
};

export const PreviewStep = ({
  previewRows,
  ignoredColumns,
  appendToDescColumns,
  characteristicColumns,
  validCount,
  invalidCount,
  warningCount,
  isLoading,
  onBack,
  onApprove,
}: Props) => {
  return (
    <View className="flex-1">
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        <Text className="text-lg font-semibold text-gray-900 mb-1">Превью импорта</Text>
        <Text className="text-sm text-gray-500 mb-4">
          Проверьте данные перед импортом
        </Text>

        <View className="flex-row gap-2 mb-4">
          <View className="flex-1 bg-teal-50 rounded-xl border border-teal-200 p-3 items-center">
            <Text className="text-2xl font-bold text-teal-700">{validCount}</Text>
            <Text className="text-xs text-teal-600">Готовы</Text>
          </View>
          {warningCount > 0 ? (
            <View className="flex-1 bg-amber-50 rounded-xl border border-amber-200 p-3 items-center">
              <Text className="text-2xl font-bold text-amber-700">{warningCount}</Text>
              <Text className="text-xs text-amber-600">С предупр.</Text>
            </View>
          ) : null}
          {invalidCount > 0 ? (
            <View className="flex-1 bg-red-50 rounded-xl border border-red-200 p-3 items-center">
              <Text className="text-2xl font-bold text-red-700">{invalidCount}</Text>
              <Text className="text-xs text-red-600">Ошибок</Text>
            </View>
          ) : null}
        </View>

        {characteristicColumns.length > 0 ? (
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Характеристики ({characteristicColumns.length}):
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {characteristicColumns.map((c) => (
                <View key={c.source} className="bg-teal-100 px-2.5 py-1 rounded-full">
                  <Text className="text-xs text-teal-700">
                    {c.name} = {c.source}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {appendToDescColumns.length > 0 ? (
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-1">
              Добавлены в описание:
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {appendToDescColumns.map((c) => (
                <View key={c} className="bg-blue-100 px-2.5 py-1 rounded-full">
                  <Text className="text-xs text-blue-700">{c}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {ignoredColumns.length > 0 ? (
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-1">
              Игнорируются:
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {ignoredColumns.map((c) => (
                <View key={c} className="bg-gray-100 px-2.5 py-1 rounded-full">
                  <Text className="text-xs text-gray-500">{c}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Text className="text-sm font-semibold text-gray-700 mb-2">
          Строки ({previewRows.length}):
        </Text>

        {previewRows.map((row) => (
          <View
            key={row.rowNumber}
            className={`border rounded-lg px-3 py-2.5 mb-2 ${
              row.status === 'INVALID'
                ? 'border-red-200 bg-red-50'
                : row.status === 'WARNING'
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-gray-200 bg-white'
            }`}
          >
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-sm font-semibold text-gray-800">
                Строка {row.rowNumber}
              </Text>
              {statusBadge(row.status)}
            </View>
            <Text className="text-sm text-gray-700" numberOfLines={2}>
              {row.rawData['Название'] || '(без названия)'}
            </Text>
            {row.errors.map((e, i) => (
              <Text key={i} className="text-xs text-red-600 mt-0.5">{e}</Text>
            ))}
            {row.warnings.map((w, i) => (
              <Text key={i} className="text-xs text-amber-600 mt-0.5">{w}</Text>
            ))}
          </View>
        ))}
      </ScrollView>

      <View className="px-4 py-3 border-t border-gray-200 flex-row gap-3">
        <View className="flex-1">
          <Button title="Назад" onPress={onBack} variant="secondary" />
        </View>
        <View className="flex-1">
          <Button
            title={`Импортировать ${validCount}`}
            onPress={onApprove}
            disabled={validCount === 0}
            loading={isLoading}
          />
        </View>
      </View>
    </View>
  );
};
