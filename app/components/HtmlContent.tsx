import RenderHtml from "react-native-render-html";
import { useWindowDimensions, type TextStyle } from "react-native";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

function plainTextToHtml(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

type Props = {
  html: string;
  style?: TextStyle;
};

export function HtmlContent({ html, style }: Props) {
  const { width } = useWindowDimensions();
  const contentWidth = Math.max(width - 64, 280);
  const sourceHtml = looksLikeHtml(html) ? html : plainTextToHtml(html);

  return (
    <RenderHtml
      contentWidth={contentWidth}
      source={{ html: sourceHtml }}
      baseStyle={{
        fontSize: 15,
        lineHeight: 24,
        color: "rgba(0,0,0,0.8)",
        ...style,
      }}
      tagsStyles={{
        body: { margin: 0, padding: 0 },
        p: { marginTop: 0, marginBottom: 8 },
        h2: {
          fontSize: 18,
          fontFamily: "PoppinsBold",
          marginTop: 8,
          marginBottom: 4,
          color: style?.color ?? "rgba(0,0,0,0.8)",
        },
        h3: {
          fontSize: 16,
          fontFamily: "PoppinsBold",
          marginTop: 6,
          marginBottom: 4,
          color: style?.color ?? "rgba(0,0,0,0.8)",
        },
        ul: { marginTop: 0, marginBottom: 8, paddingLeft: 18 },
        ol: { marginTop: 0, marginBottom: 8, paddingLeft: 18 },
        li: { marginBottom: 4 },
        strong: { fontFamily: "PoppinsBold" },
        em: { fontStyle: "italic" },
        u: { textDecorationLine: "underline" },
      }}
    />
  );
}

export default HtmlContent;
