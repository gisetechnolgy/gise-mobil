import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import {
  ActivityIndicator,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors } from '../../constants/colors';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/_LocaleContext';
import { AppText as Text } from "@/components/ui/AppText";

interface LoginPromptProps {
  title?: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export default function LoginPrompt({
  title,
  subtitle,
  icon = 'lock-closed-outline',
}: LoginPromptProps) {
  const { isLoading } = useAuth();
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('loginRequiredTitle');
  const resolvedSubtitle = subtitle ?? t('loginRequiredSubtitle');

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-app-bg items-center justify-center">
        <ActivityIndicator color={AppColors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-app-bg">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center mb-5">
          <Ionicons name={icon} size={36} color={AppColors.accent} />
        </View>

        <Text className="text-app-navy text-2xl font-extrabold text-center">
          {resolvedTitle}
        </Text>
        <Text className="text-app-navy/60 text-base text-center mt-3 leading-5">
          {resolvedSubtitle}
        </Text>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/login' as Href)}
          className="bg-primary-500 rounded-2xl py-4 items-center self-stretch mt-8"
        >
          <Text className="text-white text-base font-bold">{t('login')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/register' as Href)}
          className="rounded-2xl py-4 items-center self-stretch mt-3 border border-primary-500"
        >
          <Text className="text-primary-500 text-base font-bold">{t('signup')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
