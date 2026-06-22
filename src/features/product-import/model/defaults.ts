import type { ImportMapping } from './types';

export const BRANCH_NAME = 'Mega Silk Way';
export const BRANCH_ID = 'branch-1';
export const BUSINESS_ID = 'biz-sports-1';

export const DEMO_COLUMNS = [
  'Название',
  'Категория',
  'Описание',
  'Артикул',
  'Цена',
  'Теги',
  'Бренд',
  'Вкус',
  'Вес',
  'Остаток',
];

export const DEMO_SAMPLE_ROWS: Record<string, string>[] = [
  {
    'Название': 'Mammut Whey Protein Chocolate 5kg',
    'Категория': 'Спортпит',
    'Описание': 'Сывороточный протеин',
    'Артикул': 'MAM-WHEY-CHOCO-5',
    'Цена': '32000',
    'Теги': 'protein,whey',
    'Бренд': 'Mammut',
    'Вкус': 'Chocolate',
    'Вес': '5kg',
    'Остаток': '12',
  },
  {
    'Название': 'Optimum Nutrition Gold Standard Vanilla 2.27kg',
    'Категория': 'Спортпит',
    'Описание': 'Протеин для набора белка',
    'Артикул': 'ON-GOLD-VAN-227',
    'Цена': '28500',
    'Теги': 'protein',
    'Бренд': 'Optimum Nutrition',
    'Вкус': 'Vanilla',
    'Вес': '2.27kg',
    'Остаток': '4',
  },
  {
    'Название': 'Creatine Monohydrate 300g',
    'Категория': 'Спортпит',
    'Описание': 'Креатин моногидрат',
    'Артикул': 'CR-MONO-300',
    'Цена': '9500',
    'Теги': 'creatine',
    'Бренд': 'Generic',
    'Вкус': 'Без вкуса',
    'Вес': '300g',
    'Остаток': '25',
  },
];

export const getDefaultMappings = (columns: string[]): ImportMapping[] =>
  columns.map((col) => {
    switch (col) {
      case 'Название':
        return { sourceColumn: col, targetField: 'NAME' };
      case 'Категория':
        return { sourceColumn: col, targetField: 'CATEGORY_LABEL' };
      case 'Описание':
        return { sourceColumn: col, targetField: 'DESCRIPTION' };
      case 'Артикул':
        return { sourceColumn: col, targetField: 'SKU' };
      case 'Цена':
        return { sourceColumn: col, targetField: 'PRICE' };
      case 'Теги':
        return { sourceColumn: col, targetField: 'TAGS' };
      default:
        return { sourceColumn: col, targetField: 'IGNORE' };
    }
  });

const chars: Record<string, string> = {};

export const getFieldLabel = (field: string): string => {
  const map: Record<string, string> = {
    NAME: 'Название товара',
    CATEGORY_LABEL: 'Категория',
    DESCRIPTION: 'Описание',
    SKU: 'SKU',
    PRICE: 'Цена',
    TAGS: 'Tags',
    IGNORE: 'Игнорировать',
    APPEND_TO_DESCRIPTION: 'Добавить в описание',
    CHARACTERISTIC: 'Сделать характеристикой',
  };
  return map[field] || field;
};
