import { View, Text } from 'react-native';
import { Button } from './Button';

type Props = {
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
};

export const EmptyState = ({ title, description, actionTitle, onAction }: Props) => {
  return (
    <View className="flex-1 items-center justify-center py-16 px-6">
      <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
        <Text className="text-3xl text-gray-400">&#8962;</Text>
      </View>
      <Text className="text-lg font-semibold text-gray-900 text-center mb-1">
        {title}
      </Text>
      {description ? (
        <Text className="text-sm text-gray-500 text-center mb-6">{description}</Text>
      ) : null}
      {actionTitle && onAction ? (
        <Button title={actionTitle} onPress={onAction} variant="primary" />
      ) : null}
    </View>
  );
};
