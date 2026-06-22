import { View, Text } from 'react-native';
import type { ImportStep } from '../model/types';

const steps: { key: ImportStep; label: string }[] = [
  { key: 'upload', label: 'Загрузка' },
  { key: 'mapping', label: 'Сопоставление' },
  { key: 'preview', label: 'Превью' },
];

type Props = {
  currentStep: ImportStep;
};

export const ImportStepper = ({ currentStep }: Props) => {
  const currentIdx = steps.findIndex((s) => s.key === currentStep);

  return (
    <View className="flex-row items-center justify-center py-4 px-4">
      {steps.map((s, i) => {
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;

        return (
          <View key={s.key} className="flex-row items-center">
            {i > 0 ? (
              <View
                className={`h-0.5 w-8 mx-1 ${isDone ? 'bg-teal-500' : 'bg-gray-200'}`}
              />
            ) : null}
            <View className="items-center">
              <View
                className={`w-7 h-7 rounded-full items-center justify-center ${
                  isActive ? 'bg-teal-600' : isDone ? 'bg-teal-500' : 'bg-gray-200'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isActive || isDone ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  {isDone ? '\u2713' : String(i + 1)}
                </Text>
              </View>
              <Text
                className={`text-xs mt-1 ${
                  isActive ? 'text-teal-700 font-semibold' : 'text-gray-400'
                }`}
              >
                {s.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};
