import { useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { DETAIL_ACCENT } from "../../../constants/mobileDetail";
import { htmlToPlainText } from "../../../lib/events";
import HtmlContent from "../HtmlContent";
import { AppText as Text } from "@/components/ui/AppText";
import { useTranslation } from "../../context/_LocaleContext";

type Props = {
  title: string;
  html: string;
  clampChars?: number;
};

export default function ClampedHtmlSection({
  title,
  html,
  clampChars = 140,
}: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const plain = useMemo(() => htmlToPlainText(html).trim(), [html]);
  if (!plain) return null;

  const needsClamp = plain.length > clampChars;

  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      {expanded || !needsClamp ? (
        <HtmlContent
          html={html}
          style={{
            fontSize: 13,
            lineHeight: 20,
            color: "#343D48",
          }}
        />
      ) : (
        <Text style={styles.clamped} numberOfLines={5}>
          {plain}
        </Text>
      )}
      {!expanded && needsClamp ? (
        <TouchableOpacity onPress={() => setExpanded(true)} activeOpacity={0.7}>
          <Text style={styles.showMore}>{t("showMore")}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 10,
    fontFamily: "PoppinsBold",
    fontSize: 16,
    color: "#0F2137",
  },
  clamped: {
    fontFamily: "PoppinsRegular",
    fontSize: 13,
    lineHeight: 20,
    color: "#343D48",
  },
  showMore: {
    marginTop: 8,
    fontFamily: "PoppinsBold",
    fontSize: 13,
    color: DETAIL_ACCENT,
  },
});
