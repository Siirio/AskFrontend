import '../../global.css';

import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { RouterProvider, useNavigation } from '@/shared/lib/navigation';
import { ToastContainer } from '@/shared/ui/Toast';
import { BusinessProductsPage } from '@/pages/BusinessProductsPage';
import { ProductImportPage } from '@/pages/ProductImportPage';

const RouteRenderer = () => {
  const { currentRoute } = useNavigation();
  const { path, params } = currentRoute;

  if (path.includes('/products/import')) {
    return (
      <ProductImportPage
        branchId={params.branchId || 'branch-1'}
        branchName={params.branchName || 'Mega Silk Way'}
      />
    );
  }

  return (
    <BusinessProductsPage
      branchId={params.branchId || 'branch-1'}
      branchName={params.branchName || 'Mega Silk Way'}
    />
  );
};

export const App = () => {
  return (
    <RouterProvider>
      <View className="flex-1 bg-white">
        <StatusBar style="auto" />
        <ToastContainer />
        <RouteRenderer />
      </View>
    </RouterProvider>
  );
};
