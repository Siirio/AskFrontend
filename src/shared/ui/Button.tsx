import { Text, TouchableOpacity, ActivityIndicator } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-teal-600 active:bg-teal-700',
  secondary: 'bg-gray-200 active:bg-gray-300',
  danger: 'bg-red-600 active:bg-red-700',
  ghost: 'bg-transparent active:bg-gray-100',
};

const textClasses: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-gray-800',
  danger: 'text-white',
  ghost: 'text-teal-600',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5',
  md: 'px-4 py-2.5',
  lg: 'px-6 py-3',
};

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  size = 'md',
}: Props) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      className={`rounded-lg items-center justify-center ${variantClasses[variant]} ${sizeClasses[size]} ${isDisabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' || variant === 'ghost' ? '#0f766e' : '#ffffff'}
        />
      ) : (
        <Text
          className={`font-semibold text-center ${textClasses[variant]}`}
          style={{ fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 14 }}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};
