import { useState, useMemo } from 'react';
import { View, Text } from 'react-native';
import { useStore, searchProducts } from '@/core/store';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ProductTable } from '@/entities/product/ui/ProductTable';
import { ProductEditModal } from '@/entities/product/ui/ProductEditModal';
import { ProductSearchInput } from '@/features/product-import/ui/ProductSearchInput';
import { useNavigation } from '@/shared/lib/navigation';
import { showToast } from '@/shared/ui/Toast';
import type { Product } from '@/entities/product/model/types';

type Props = {
  branchId: string;
  branchName: string;
};

export const BusinessProductsPage = ({ branchId, branchName }: Props) => {
  const { navigate } = useNavigation();
  const { products, toggleEnabled, deleteProduct, updateProduct } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const filtered = useMemo(
    () => searchProducts(branchId, searchQuery)(useStore.getState()),
    [products, branchId, searchQuery],
  );

  const handleImport = () => {
    navigate('/business/branches/' + branchId + '/products/import', {
      branchId,
      branchName,
    });
  };

  const handleEdit = (product: Product) => {
    setEditTarget(product);
    setEditModalVisible(true);
  };

  const handleSave = (id: string, patch: Partial<Product>) => {
    updateProduct(id, patch);
    showToast('Товар обновлён', 'success');
  };

  const handleToggle = (product: Product) => {
    toggleEnabled(product.id);
    showToast(
      product.enabled ? 'Товар выключен' : 'Товар включен',
      'success',
    );
  };

  const handleDelete = (product: Product) => {
    deleteProduct(product.id);
    showToast('Товар удалён', 'success');
  };

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-3 pb-2 border-b border-gray-200 bg-white">
        <Text className="text-lg font-semibold text-gray-900">
          Товары
        </Text>
        <Text className="text-sm text-gray-500">{branchName}</Text>
      </View>

      {products.filter((p) => p.branchId === branchId).length > 0 ? (
        <ProductSearchInput value={searchQuery} onChange={setSearchQuery} />
      ) : null}

      {filtered.length > 0 ? (
        <ProductTable
          products={filtered}
          onEdit={handleEdit}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      ) : null}

      {products.filter((p) => p.branchId === branchId).length === 0 ? (
        <EmptyState
          title="Нет товаров"
          description="Импортируйте товары из Excel или добавьте вручную"
          actionTitle="Импорт из Excel"
          onAction={handleImport}
        />
      ) : null}

      {products.filter((p) => p.branchId === branchId).length > 0 && filtered.length === 0 ? (
        <EmptyState
          title="Ничего не найдено"
          description="Попробуйте изменить поисковый запрос"
        />
      ) : null}

      {products.filter((p) => p.branchId === branchId).length > 0 ? (
        <View className="px-4 py-3 border-t border-gray-200">
          <Button title="Импорт из Excel" onPress={handleImport} />
        </View>
      ) : null}

      <ProductEditModal
        visible={editModalVisible}
        product={editTarget}
        onClose={() => setEditModalVisible(false)}
        onSave={handleSave}
      />
    </View>
  );
};
