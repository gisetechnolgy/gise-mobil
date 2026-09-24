import { useLocalSearchParams } from "expo-router";
import { CmsPageScreen } from "../components/CmsPageScreen";

export default function PanelPageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pageId = Array.isArray(id) ? id[0] : id;
  return <CmsPageScreen pageId={pageId ?? ""} />;
}
