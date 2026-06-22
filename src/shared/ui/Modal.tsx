import { Modal as RNModal, View, Text, TouchableOpacity, ScrollView } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export const Modal = ({ visible, onClose, title, children }: Props) => {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center p-4">
        <View className="bg-white rounded-xl w-full max-w-md max-h-[80%] overflow-hidden shadow-lg">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
            <Text className="text-lg font-semibold text-gray-900">{title}</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Text className="text-gray-400 text-xl">&times;</Text>
            </TouchableOpacity>
          </View>
          <ScrollView className="px-4 py-3" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </RNModal>
  );
};
