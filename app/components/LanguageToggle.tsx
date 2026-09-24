import { StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { useLocale } from '../context/_LocaleContext';
import { AppText as Text } from '@/components/ui/AppText';

type Props = {
  style?: StyleProp<ViewStyle>;
  textStyle?: object;
};

/** Shows the alternate language code; tap to switch (TR screen → EN badge). */
export default function LanguageToggle({ style, textStyle }: Props) {
  const { locale, toggleLocale } = useLocale();
  const label = locale === 'tr' ? 'EN' : 'TR';

  return (
    <TouchableOpacity
      onPress={() => void toggleLocale()}
      activeOpacity={0.8}
      style={[styles.badge, style]}
    >
      <Text style={[styles.text, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'PoppinsSemiBold',
    letterSpacing: 1,
  },
});
