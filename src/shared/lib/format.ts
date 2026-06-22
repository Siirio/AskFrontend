export const formatPrice = (value: number | null | undefined): string => {
  if (value == null) return '';
  return new Intl.NumberFormat('ru-KZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + ' ₸';
};

export const formatDate = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin} мин назад`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)} ч назад`;

  return date.toLocaleDateString('ru-KZ', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};
