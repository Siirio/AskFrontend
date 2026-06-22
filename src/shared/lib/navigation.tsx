import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

type RouteParams = Record<string, string>;

type Route = {
  path: string;
  params: RouteParams;
};

type NavigationContextValue = {
  currentRoute: Route;
  navigate: (path: string, params?: RouteParams) => void;
  goBack: () => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

const parsePath = (path: string): { path: string; params: RouteParams } => {
  const params: RouteParams = {};

  const segments = path.split('/');
  if (segments.includes('branches') && segments.length > segments.indexOf('branches') + 1) {
    const idx = segments.indexOf('branches');
    params.branchId = segments[idx + 1];
  }

  return { path, params };
};

export const RouterProvider = ({ children }: { children: ReactNode }) => {
  const [stack, setStack] = useState<Route[]>([
    { path: '/business/branches/branch-1/products', params: { branchId: 'branch-1' } },
  ]);

  const currentRoute = stack[stack.length - 1];

  const navigate = useCallback((path: string, extraParams?: RouteParams) => {
    const parsed = parsePath(path);
    setStack((prev) => [
      ...prev,
      { path, params: { ...parsed.params, ...extraParams } },
    ]);
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  return (
    <NavigationContext.Provider value={{ currentRoute, navigate, goBack }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within RouterProvider');
  return ctx;
};
