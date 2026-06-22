import { useRef, useCallback, useState } from 'react';
import { View, Text, Platform, TouchableOpacity } from 'react-native';
import { Button } from '@/shared/ui/Button';

type Props = {
  branchName: string;
  isLoading: boolean;
  onUseDemoDataset: () => void;
  onFilePicked: (columns: string[], rows: Record<string, string>[]) => void;
};

const parseExcelFile = async (file: File): Promise<{ columns: string[]; rows: Record<string, string>[] }> => {
  const XLSX = require('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const columns: string[] = data.length > 0 ? Object.keys(data[0]) : [];

  const rows = data.map((row: Record<string, unknown>) => {
    const clean: Record<string, string> = {};
    for (const key of Object.keys(row)) {
      clean[key] = String(row[key] ?? '');
    }
    return clean;
  });

  return { columns, rows };
};

const isWeb = Platform.OS === 'web';

const RECOMMENDED_COLUMNS = [
  { field: 'Название товара', examples: 'Наименование, Название, Товар, Name, Product' },
  { field: 'Категория', examples: 'Категория товара, Группа, Category' },
  { field: 'Артикул / Код товара', examples: 'SKU, ШК, Код, Арт, Article, Barcode' },
  { field: 'Цена', examples: 'Цена продажи, Розница, Стоимость, Price' },
  { field: 'Описание', examples: 'Описание товара, Description' },
  { field: 'Теги', examples: 'Метки, Tags (через запятую)' },
];

export const ImportUploadStep = ({ branchName, isLoading, onUseDemoDataset, onFilePicked }: Props) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [parsing, setParsing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const handlePickFile = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setParsing(true);
    try {
      const { columns, rows } = await parseExcelFile(file);
      onFilePicked(columns, rows);
    } catch {
      // silently ignore parse errors
    } finally {
      setParsing(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }, [onFilePicked]);

  return (
    <View className="flex-1 px-4 pt-6">
      {isWeb && (
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      )}

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
              onPress={handlePickFile}
              variant="secondary"
              loading={parsing}
            />
            <Text className="text-xs text-gray-400 text-center mt-1">
              Поддерживаются файлы .xlsx и .xls
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

      <View className="bg-amber-50 rounded-xl border border-amber-200 p-4 mb-4">
        <Text className="text-amber-800 font-semibold text-sm mb-2">{'\u26A0'} Важно</Text>
        <Text className="text-amber-700 text-sm leading-5">
          Вы заполняете данные для витрины — то, что увидит клиент.{'\n\n'}
          Не включайте в файл: остатки, закупочные цены, поставщиков, маржинальность и другие внутренние данные бизнеса.
        </Text>
      </View>

      <View className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <TouchableOpacity
          onPress={() => setShowGuide(!showGuide)}
          className="flex-row items-center justify-between px-4 py-3"
        >
          <Text className="text-sm font-medium text-gray-700">
            Рекомендуемый формат колонок
          </Text>
          <Text className="text-sm text-gray-400">{showGuide ? '\u25B2' : '\u25BC'}</Text>
        </TouchableOpacity>
        {showGuide && (
          <View className="px-4 pb-4">
            <Text className="text-xs text-gray-500 mb-3">
              Приложение автоматически распознаёт колонки по названиям. Для наилучшего результата используйте указанные варианты:
            </Text>
            {RECOMMENDED_COLUMNS.map((col) => (
              <View key={col.field} className="flex-row py-2 border-b border-gray-100">
                <Text className="text-sm font-medium text-gray-800 flex-1">
                  {col.field}
                </Text>
                <Text className="text-xs text-gray-400 flex-1 text-right">
                  {col.examples}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};
