import type { ImportMapping, TargetField } from './types';

export const BRANCH_NAME = 'Mega Silk Way';
export const BRANCH_ID = 'branch-1';
export const BUSINESS_ID = 'biz-sports-1';

const COLUMN_MATCHERS: { field: TargetField; patterns: string[] }[] = [
  {
    field: 'NAME',
    patterns: [
      'название', 'наименование', 'название товара', 'наименование товара',
      'продукт', 'имя товара',
      'name', 'product', 'title', 'product name', 'наименование продукта',
    ],
  },
  {
    field: 'CATEGORY_LABEL',
    patterns: [
      'категория', 'категория товара', 'группа', 'группа товара',
      'тип товара', 'раздел', 'вид товара',
      'category', 'group', 'type',
    ],
  },
  {
    field: 'DESCRIPTION',
    patterns: [
      'описание', 'описание товара', 'краткое описание',
      'description', 'info',
    ],
  },
  {
    field: 'SKU',
    patterns: [
      'артикул', 'код товара', 'код', 'шк', 'штрихкод',
      'sku', 'article', 'barcode', 'vendor code', 'арт',
      'артикул/код', 'артикул код',
    ],
  },
  {
    field: 'PRICE',
    patterns: [
      'цена', 'цена продажи', 'розничная цена', 'розница',
      'стоимость', 'прайс',
      'price', 'cost', 'retail price',
    ],
  },
  {
    field: 'TAGS',
    patterns: [
      'теги', 'тэги', 'метки', 'ключевые слова',
      'tags', 'labels', 'keywords', 'тэг',
    ],
  },
];

const normalize = (s: string): string =>
  s.trim().toLowerCase().replace(/\s+/g, ' ');

const matchField = (column: string): TargetField | null => {
  const col = normalize(column);
  let bestMatch: { field: TargetField; length: number } | null = null;

  for (const matcher of COLUMN_MATCHERS) {
    for (const pattern of matcher.patterns) {
      if (col === pattern || col.includes(pattern) || pattern.includes(col)) {
        if (!bestMatch || pattern.length > bestMatch.length) {
          bestMatch = { field: matcher.field, length: pattern.length };
        }
      }
    }
  }

  return bestMatch?.field ?? null;
};

export const getDefaultMappings = (columns: string[]): ImportMapping[] =>
  columns.map((col) => ({
    sourceColumn: col,
    targetField: matchField(col) ?? 'IGNORE',
  }));

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
