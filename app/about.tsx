import { Stack } from "expo-router";
import {
  ScrollView,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "./context/LocaleContext";
import { AppText as Text } from "@/components/ui/AppText";

export default function AboutScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-app-bg">
      <Stack.Screen options={{ title: t("aboutTitle") }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40 }}
      >
        <View className="bg-white rounded-2xl p-4">
          <Text className="text-app-navy text-lg font-bold">Gişe Kıbrıs</Text>
          <Text className="text-app-navy/80 text-sm mt-2 leading-6">
            {t("aboutDescription")}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
