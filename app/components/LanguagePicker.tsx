import { useCallback, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type LayoutRectangle,
} from "react-native";
import { CONTROL_BORDER } from "../../constants/homeSection";
import { AppColors } from "../../constants/colors";
import type { AppLocale } from "../../lib/appLocale";
import { useLocale, useTranslation } from "../context/_LocaleContext";
import { AppText as Text } from "@/components/ui/AppText";

const LANGUAGES: { code: AppLocale; label: string }[] = [
  { code: "tr", label: "TR" },
  { code: "en", label: "EN" },
];

const PHONE_W = 360;
const TABLET_W = 768;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Navbar kontrolleri — telefon 40 → tablet 48 */
export function getNavControlScale(screenWidth: number) {
  const t = Math.min(
    1,
    Math.max(0, (screenWidth - PHONE_W) / (TABLET_W - PHONE_W)),
  );
  return {
    size: Math.round(lerp(40, 48, t)),
    radius: Math.round(lerp(10, 12, t)),
    fontSize: Math.round(lerp(12, 14, t)),
    iconSize: Math.round(lerp(18, 22, t)),
    itemPadY: Math.round(lerp(8, 11, t)),
    dropdownRadius: Math.round(lerp(8, 10, t)),
  };
}

function navControlScale(screenWidth: number) {
  return getNavControlScale(screenWidth);
}

/** Web LanguagePicker mobileNav — ölçekli TR/EN select */
export default function LanguagePicker() {
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const scale = useMemo(() => navControlScale(screenWidth), [screenWidth]);
  const rootRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<LayoutRectangle | null>(null);

  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  const close = useCallback(() => {
    setOpen(false);
    setAnchor(null);
  }, []);

  const openMenu = useCallback(() => {
    // Modal açılmadan önce ölç — Android’de Modal üstündeyken measure bozulur
    rootRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  }, []);

  const onSelect = useCallback(
    async (code: AppLocale) => {
      close();
      if (code !== locale) await setLocale(code);
    },
    [close, locale, setLocale],
  );

  const dropdownTop = anchor ? anchor.y + anchor.height : 0;

  const dropdownLeft = anchor
    ? Math.min(
        Math.max(8, anchor.x),
        screenWidth - Math.max(anchor.width, scale.size) - 8,
      )
    : 0;

  return (
    <>
      <View
        ref={rootRef}
        collapsable={false}
        style={{
          width: scale.size,
          height: scale.size,
          flexShrink: 0,
        }}
      >
        <TouchableOpacity
          onPress={openMenu}
          style={[
            styles.trigger,
            {
              width: scale.size,
              height: scale.size,
              borderRadius: scale.radius,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("selectLanguage")}
          accessibilityState={{ expanded: open }}
          activeOpacity={0.85}
        >
          <Text style={[styles.label, { fontSize: scale.fontSize }]}>
            {current.label}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent
      >
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          {anchor ? (
            <View
              style={[
                styles.dropdown,
                {
                  top: dropdownTop,
                  left: dropdownLeft,
                  width: Math.max(anchor.width, scale.size),
                  borderRadius: scale.dropdownRadius,
                },
              ]}
            >
              {LANGUAGES.map(({ code, label }) => {
                const active = locale === code;
                return (
                  <TouchableOpacity
                    key={code}
                    onPress={() => void onSelect(code)}
                    style={[
                      styles.item,
                      { paddingVertical: scale.itemPadY },
                      active && styles.itemActive,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.itemText,
                        { fontSize: scale.fontSize },
                        active && styles.itemTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderColor: CONTROL_BORDER,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  label: {
    fontFamily: "PoppinsBold",
    color: "#2D2D2D",
    letterSpacing: 0.5,
  },
  modalRoot: {
    flex: 1,
  },
  dropdown: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 12,
  },
  item: {
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  itemActive: {
    backgroundColor: "rgba(174, 37, 109, 0.08)",
  },
  itemText: {
    fontFamily: "PoppinsMedium",
    color: "#2D2D2D",
    textAlign: "center",
  },
  itemTextActive: {
    fontFamily: "PoppinsBold",
    color: AppColors.accent,
  },
});
