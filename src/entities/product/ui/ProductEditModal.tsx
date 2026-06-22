import { useState, useEffect } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import type { Product } from '../model/types';

type Props = {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Product>) => void;
};

export const ProductEditModal = ({ visible, product, onClose, onSave }: Props) => {
  const [name, setName] = useState('');
  const [categoryLabel, setCategoryLabel] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [tagsStr, setTagsStr] = useState('');

  useEffect(() => {
    if (product) {
      setName(product.name);
      setCategoryLabel(product.categoryLabel || '');
      setDescription(product.description || '');
      setSku(product.sku || '');
      setPriceStr(product.price != null ? String(product.price) : '');
      setTagsStr(product.tags.join(', '));
    }
  }, [product]);

  const handleSave = () => {
    if (!product) return;
    const priceNum = priceStr.trim() ? parseFloat(priceStr.replace(/[^0-9.]/g, '')) : null;
    onSave(product.id, {
      name: name.trim(),
      categoryLabel: categoryLabel.trim() || undefined,
      description: description.trim() || undefined,
      sku: sku.trim() || undefined,
      price: isNaN(priceNum as number) ? product.price : priceNum,
      tags: tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Редактировать товар">
      <View className="gap-3">
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Название</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
            placeholder="Название товара"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Категория</Text>
          <TextInput
            value={categoryLabel}
            onChangeText={setCategoryLabel}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
            placeholder="Категория"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">SKU</Text>
          <TextInput
            value={sku}
            onChangeText={setSku}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
            placeholder="Артикул"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Цена</Text>
          <TextInput
            value={priceStr}
            onChangeText={setPriceStr}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
            placeholder="Цена"
            keyboardType="numeric"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Описание</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
            placeholder="Описание"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ minHeight: 70 }}
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Теги (через запятую)</Text>
          <TextInput
            value={tagsStr}
            onChangeText={setTagsStr}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
            placeholder="protein, whey"
          />
        </View>

        <View className="flex-row gap-2 mt-2">
          <View className="flex-1">
            <Button title="Отмена" onPress={onClose} variant="secondary" size="sm" />
          </View>
          <View className="flex-1">
            <Button title="Сохранить" onPress={handleSave} size="sm" />
          </View>
        </View>
      </View>
    </Modal>
  );
};
