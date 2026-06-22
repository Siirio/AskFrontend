import { ScrollView, View, Text } from 'react-native';
import type { Product } from '../model/types';
import { ProductRow } from './ProductRow';

type Props = {
  products: Product[];
  onEdit: (product: Product) => void;
  onToggle: (product: Product) => void;
  onDelete: (product: Product) => void;
};

export const ProductTable = ({ products, onEdit, onToggle, onDelete }: Props) => {
  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {products.map((product) => (
        <ProductRow
          key={product.id}
          product={product}
          onEdit={() => onEdit(product)}
          onToggle={() => onToggle(product)}
          onDelete={() => onDelete(product)}
        />
      ))}
      <View className="h-4" />
    </ScrollView>
  );
};
