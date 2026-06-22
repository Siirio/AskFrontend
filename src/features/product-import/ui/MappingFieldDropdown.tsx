import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import type { TargetField, ImportMapping } from '../model/types';
import { getFieldLabel } from '../model/defaults';

type Props = {
  columnName: string;
  sampleValues: string[];
  currentMapping: ImportMapping;
  isKnownField: boolean;
  onSave: (mapping: ImportMapping) => void;
};

type FieldOption = {
  value: TargetField;
  label: string;
  section: 'known' | 'unknown';
};

const knownOptions: FieldOption[] = [
  { value: 'NAME', label: 'Название товара', section: 'known' },
  { value: 'CATEGORY_LABEL', label: 'Категория', section: 'known' },
  { value: 'DESCRIPTION', label: 'Описание', section: 'known' },
  { value: 'SKU', label: 'SKU', section: 'known' },
  { value: 'PRICE', label: 'Цена', section: 'known' },
  { value: 'TAGS', label: 'Tags', section: 'known' },
  { value: 'IGNORE', label: 'Игнорировать', section: 'known' },
];

const unknownOptions: FieldOption[] = [
  { value: 'IGNORE', label: 'Игнорировать', section: 'unknown' },
  { value: 'APPEND_TO_DESCRIPTION', label: 'Добавить в описание', section: 'unknown' },
  { value: 'CHARACTERISTIC', label: 'Сделать характеристикой', section: 'unknown' },
];

export const MappingFieldDropdown = ({
  columnName,
  sampleValues,
  currentMapping,
  isKnownField,
  onSave,
}: Props) => {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<TargetField>(currentMapping.targetField);
  const [charName, setCharName] = useState(
    currentMapping.characteristicName || columnName,
  );

  const options = isKnownField ? knownOptions : unknownOptions;

  const handleConfirm = () => {
    onSave({
      sourceColumn: columnName,
      targetField: selected,
      characteristicName: selected === 'CHARACTERISTIC' ? charName : undefined,
    });
    setVisible(false);
  };

  const currentLabel = currentMapping.targetField === 'CHARACTERISTIC'
    ? 'Хар-ка: ' + (currentMapping.characteristicName || columnName)
    : getFieldLabel(currentMapping.targetField);

  const isMapped = currentMapping.targetField !== 'IGNORE';

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        className={`px-3 py-2 rounded-lg border ${
          isMapped ? 'border-teal-300 bg-teal-50' : 'border-gray-200 bg-gray-50'
        }`}
      >
        <Text
          className={`text-sm ${isMapped ? 'text-teal-700 font-medium' : 'text-gray-500'}`}
          numberOfLines={1}
        >
          {currentLabel}
        </Text>
      </TouchableOpacity>

      <Modal visible={visible} onClose={() => setVisible(false)} title={columnName}>
        <View className="mb-3">
          <Text className="text-xs text-gray-400 mb-1">Примеры значений:</Text>
          {sampleValues.slice(0, 3).map((v, i) => (
            <Text key={i} className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded mb-0.5">
              {v || '(пусто)'}
            </Text>
          ))}
        </View>

        <Text className="text-sm font-semibold text-gray-700 mb-2">Назначение поля:</Text>

        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setSelected(opt.value)}
            className={`flex-row items-center px-3 py-2.5 rounded-lg mb-1 border ${
              selected === opt.value
                ? 'border-teal-400 bg-teal-50'
                : 'border-gray-100 bg-white'
            }`}
          >
            <View
              className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                selected === opt.value ? 'border-teal-500' : 'border-gray-300'
              }`}
            >
              {selected === opt.value ? (
                <View className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              ) : null}
            </View>
            <Text
              className={`text-sm ${
                selected === opt.value ? 'text-teal-800 font-medium' : 'text-gray-700'
              }`}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}

        {selected === 'CHARACTERISTIC' ? (
          <View className="mt-3 pt-3 border-t border-gray-200">
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Название характеристики:
            </Text>
            <TextInput
              value={charName}
              onChangeText={setCharName}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
              placeholder="Введите название"
              placeholderTextColor="#9ca3af"
            />
          </View>
        ) : null}

        <View className="mt-4 flex-row gap-2">
          <View className="flex-1">
            <Button
              title="Отмена"
              onPress={() => setVisible(false)}
              variant="secondary"
              size="sm"
            />
          </View>
          <View className="flex-1">
            <Button title="Применить" onPress={handleConfirm} size="sm" />
          </View>
        </View>
      </Modal>
    </>
  );
};
