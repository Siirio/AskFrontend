import { View, Text, ScrollView } from 'react-native';
import { Button } from '@/shared/ui/Button';
import { MappingFieldDropdown } from './MappingFieldDropdown';
import type { ImportMapping } from '../model/types';

const KNOWN_FIELDS = new Set([
  'Название', 'Категория', 'Описание', 'Артикул', 'Цена', 'Теги',
]);

type Props = {
  columns: string[];
  sampleRows: Record<string, string>[];
  mappings: ImportMapping[];
  isLoading: boolean;
  onUpdateMapping: (index: number, mapping: ImportMapping) => void;
  onBack: () => void;
  onContinue: () => void;
};

export const MappingStep = ({
  columns,
  sampleRows,
  mappings,
  isLoading,
  onUpdateMapping,
  onBack,
  onContinue,
}: Props) => {
  const getSampleValues = (col: string): string[] =>
    sampleRows.map((r) => r[col] ?? '');

  const hasName = mappings.some((m) => m.targetField === 'NAME');

  return (
    <View className="flex-1">
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        <Text className="text-lg font-semibold text-gray-900 mb-1">
          Сопоставление колонок
        </Text>
        <Text className="text-sm text-gray-500 mb-4">
          Сопоставьте Excel-колонки с полями товаров. Название товара обязательно.
        </Text>

        {!hasName ? (
          <View className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            <Text className="text-red-700 text-sm font-medium">
              Укажите колонку для названия товара
            </Text>
          </View>
        ) : null}

        <View className="border border-gray-200 rounded-xl overflow-hidden mb-4">
          <View className="flex-row bg-gray-50 border-b border-gray-200">
            <View className="flex-[2] px-3 py-2">
              <Text className="text-xs font-semibold text-gray-500">Колонка Excel</Text>
            </View>
            <View className="flex-[2] px-3 py-2">
              <Text className="text-xs font-semibold text-gray-500">Поле Ask</Text>
            </View>
            <View className="flex-[3] px-3 py-2">
              <Text className="text-xs font-semibold text-gray-500">Пример значений</Text>
            </View>
          </View>

          {columns.map((col, i) => {
            const mapping = mappings[i];
            const sampleVals = getSampleValues(col);
            const isKnownField = KNOWN_FIELDS.has(col);

            return (
              <View
                key={col}
                className={`flex-row border-b border-gray-100 ${
                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                }`}
              >
                <View className="flex-[2] px-3 py-2.5 justify-center">
                  <Text className="text-sm text-gray-800" numberOfLines={1}>
                    {col}
                  </Text>
                </View>
                <View className="flex-[2] px-1 py-1.5 justify-center">
                  {mapping ? (
                    <MappingFieldDropdown
                      columnName={col}
                      sampleValues={sampleVals}
                      currentMapping={mapping}
                      isKnownField={isKnownField}
                      onSave={(m) => onUpdateMapping(i, m)}
                    />
                  ) : null}
                </View>
                <View className="flex-[3] px-3 py-2.5 justify-center">
                  <Text className="text-xs text-gray-500" numberOfLines={1}>
                    {sampleVals[0] || '(пусто)'}
                  </Text>
                  {sampleVals[1] ? (
                    <Text className="text-xs text-gray-400" numberOfLines={1}>
                      {sampleVals[1]}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View className="px-4 py-3 border-t border-gray-200 flex-row gap-3">
        <View className="flex-1">
          <Button title="Назад" onPress={onBack} variant="secondary" />
        </View>
        <View className="flex-1">
          <Button
            title="Продолжить"
            onPress={onContinue}
            disabled={!hasName}
            loading={isLoading}
          />
        </View>
      </View>
    </View>
  );
};
