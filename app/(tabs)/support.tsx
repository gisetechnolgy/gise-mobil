import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import HtmlContent from "../components/HtmlContent";
import MobileHomeHeader from "../components/MobileHomeHeader";
import InAppVideoModal, {
  type InAppVideoSource,
} from "../../components/InAppVideoModal";
import { AppColors } from "../../constants/colors";
import { PAGE_GUTTER } from "../../constants/homeSection";
import { TAB_BAR_SCROLL_BOTTOM } from "../../constants/tabBar";
import { useAuth } from "../context/AuthContext";
import { useDrawer } from "../context/DrawerContext";
import { useLocale } from "../context/_LocaleContext";
import { useNotificationsPanel } from "../context/NotificationContext";
import { WIDGET_LIMITS } from "../../lib/helpdesk/config";
import {
  getFaqTranslation,
  hdT,
  type HelpdeskStringKey,
} from "../../lib/helpdesk/strings";
import type {
  HelpdeskFaqCategory,
  HelpdeskFaqItem,
  HelpdeskLang,
  HelpdeskMessage,
} from "../../lib/helpdesk/types";
import { useHelpdeskSupport } from "../../lib/helpdesk/useHelpdeskSupport";
import { useIsTablet } from "../../lib/responsive";
import { AppText as Text } from "@/components/ui/AppText";

function faqVideoSource(item: HelpdeskFaqItem): InAppVideoSource | null {
  const video = item.videos?.[0];
  if (!video) return null;
  if (!video.youtubeId && !video.videoUrl) return null;
  return {
    youtubeId: video.youtubeId,
    videoUrl: video.videoUrl,
    title: video.title,
  };
}

export default function SupportScreen() {
  const { locale } = useLocale();
  const lang: HelpdeskLang = locale === "en" ? "en" : "tr";
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { openDrawer } = useDrawer();
  const { openNotifications, unreadCount } = useNotificationsPanel();
  const { user } = useAuth();
  const hd = useHelpdeskSupport(user, lang);
  const listRef = useRef<FlatList<HelpdeskMessage>>(null);
  const [videoSource, setVideoSource] = useState<InAppVideoSource | null>(null);

  const t = useCallback(
    (key: HelpdeskStringKey) => hdT(lang, key),
    [lang],
  );

  const openVideo = useCallback((item: HelpdeskFaqItem) => {
    const source = faqVideoSource(item);
    if (source) setVideoSource(source);
  }, []);

  const tabClearance = isTablet
    ? TAB_BAR_SCROLL_BOTTOM.tablet
    : TAB_BAR_SCROLL_BOTTOM.phone;
  const bottomPad = Math.max(insets.bottom, 16) + tabClearance;

  useEffect(() => {
    if (hd.view !== "chat") return;
    const id = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(id);
  }, [hd.messages, hd.view, hd.awaitingStaff]);

  return (
    <SafeAreaView edges={["left", "right"]} style={styles.safe}>
      <StatusBar style="dark" />
      <MobileHomeHeader
        onMenuPress={openDrawer}
        onNotificationPress={openNotifications}
        notificationUnreadCount={unreadCount}
      />

      <InAppVideoModal
        visible={!!videoSource}
        source={videoSource}
        onClose={() => setVideoSource(null)}
        closeLabel={lang === "en" ? "Close" : "Kapat"}
      />

      {hd.notice ? (
        <View style={styles.notice}>
          <Ionicons name="information-circle" size={18} color={AppColors.accent} />
          <Text style={styles.noticeText}>{hd.notice}</Text>
        </View>
      ) : null}

      {hd.booting ? (
        <View style={styles.centered}>
          <ActivityIndicator color={AppColors.accent} size="large" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          {hd.view === "faq" ? (
            <FaqView
              lang={lang}
              t={t}
              bottomPad={bottomPad}
              faqs={hd.faqs}
              faqsLoading={hd.faqsLoading}
              faqSearchQuery={hd.faqSearchQuery}
              onFaqSearch={hd.onFaqSearch}
              faqSearchResults={hd.faqSearchResults}
              faqSearchLoading={hd.faqSearchLoading}
              expandedFaqItemId={hd.expandedFaqItemId}
              setExpandedFaqItemId={hd.setExpandedFaqItemId}
              onGetSupport={hd.goToSupportForm}
              onWatchVideo={openVideo}
            />
          ) : null}

          {hd.view === "form" ? (
            <FormView
              t={t}
              bottomPad={bottomPad}
              form={hd.form}
              setForm={hd.setForm}
              lockEmail={hd.user.lockEmail}
              sending={hd.sending}
              onSubmit={() => void hd.submitTicket()}
              goBack={hd.goToFaq}
            />
          ) : null}

          {hd.view === "chat" ? (
            <ChatView
              t={t}
              bottomPad={bottomPad}
              listRef={listRef}
              messages={hd.messages}
              chatDraft={hd.chatDraft}
              setChatDraft={hd.setChatDraft}
              sending={hd.sending}
              awaitingStaff={hd.awaitingStaff}
              showResolveChip={hd.showResolveChip}
              ticketStatus={hd.ticketStatus}
              countdownLabel={hd.countdownLabel}
              onSend={() => void hd.sendChat()}
              onResolve={hd.confirmResolve}
            />
          ) : null}

          {hd.view === "survey" ? (
            <SurveyView
              t={t}
              bottomPad={bottomPad}
              rating={hd.surveyRating}
              setRating={hd.setSurveyRating}
              comment={hd.surveyComment}
              setComment={hd.setSurveyComment}
              sending={hd.sending}
              onSubmit={() => void hd.onSubmitSurvey()}
              onSkip={() => void hd.finishSurvey(true)}
            />
          ) : null}

          {hd.view === "resolved" ? (
            <ResolvedView
              t={t}
              bottomPad={bottomPad}
              closeReason={hd.closeReason}
              onNew={() => void hd.startNewConversation()}
            />
          ) : null}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function FaqView({
  lang,
  t,
  bottomPad,
  faqs,
  faqsLoading,
  faqSearchQuery,
  onFaqSearch,
  faqSearchResults,
  faqSearchLoading,
  expandedFaqItemId,
  setExpandedFaqItemId,
  onGetSupport,
  onWatchVideo,
}: {
  lang: HelpdeskLang;
  t: (k: HelpdeskStringKey) => string;
  bottomPad: number;
  faqs: HelpdeskFaqCategory[];
  faqsLoading: boolean;
  faqSearchQuery: string;
  onFaqSearch: (q: string) => void;
  faqSearchResults: HelpdeskFaqCategory[];
  faqSearchLoading: boolean;
  expandedFaqItemId: string | null;
  setExpandedFaqItemId: (id: string | null) => void;
  onGetSupport: () => void;
  onWatchVideo: (item: HelpdeskFaqItem) => void;
}) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    () => new Set(),
  );
  const searching = faqSearchQuery.trim().length > 0;

  const popular: { id: string; question: string; categoryId: string }[] = [];
  faqs.forEach((cat) => {
    (cat.items || []).forEach((item) => {
      if (!item.isPopular) return;
      const question = getFaqTranslation(item.translations, lang, "question");
      if (!question) return;
      popular.push({ id: item.id, question, categoryId: cat.id });
    });
  });

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openPopular = (itemId: string, categoryId: string) => {
    setOpenCategories((prev) => new Set(prev).add(categoryId));
    setExpandedFaqItemId(itemId);
    onFaqSearch("");
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{
        paddingHorizontal: PAGE_GUTTER,
        paddingTop: 16,
        paddingBottom: bottomPad,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>{t("support")}</Text>
      <Text style={styles.pageSubtitle}>{t("faqPrompt")}</Text>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="rgba(0,0,0,0.35)" />
        <TextInput
          value={faqSearchQuery}
          onChangeText={onFaqSearch}
          placeholder={t("faqSearchPlaceholder")}
          placeholderTextColor="rgba(0,0,0,0.35)"
          style={styles.searchInput}
          autoCorrect={false}
        />
        {faqSearchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => onFaqSearch("")} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color="rgba(0,0,0,0.3)" />
          </TouchableOpacity>
        ) : null}
      </View>

      {searching ? (
        faqSearchLoading ? (
          <ActivityIndicator color="#111" style={{ marginVertical: 24 }} />
        ) : faqSearchResults.length === 0 ? (
          <Text style={styles.muted}>{t("faqNoResults")}</Text>
        ) : (
          <View style={styles.accordionCard}>
            {faqSearchResults.flatMap((cat) =>
              (cat.items || []).map((item) => {
                const q = getFaqTranslation(item.translations, lang, "question");
                if (!q) return null;
                const open = expandedFaqItemId === item.id;
                const answer = getFaqTranslation(
                  item.translations,
                  lang,
                  "answer",
                );
                return (
                  <FaqAccordionRow
                    key={item.id}
                    question={q}
                    answer={answer}
                    open={open}
                    onToggle={() =>
                      setExpandedFaqItemId(open ? null : item.id)
                    }
                    item={item}
                    watchLabel={t("watchVideo")}
                    onWatchVideo={onWatchVideo}
                  />
                );
              }),
            )}
          </View>
        )
      ) : (
        <>
          {popular.length > 0 ? (
            <Text style={styles.popularParagraph}>
              <Text style={styles.popularLabel}>{t("faqPopularTopics")} </Text>
              {popular.map((p, i) => (
                <Text key={p.id}>
                  <Text
                    style={styles.popularLink}
                    onPress={() => openPopular(p.id, p.categoryId)}
                  >
                    {p.question}
                  </Text>
                  {i < popular.length - 1 ? ", " : ""}
                </Text>
              ))}
            </Text>
          ) : null}

          {faqsLoading ? (
            <ActivityIndicator color="#111" style={{ marginTop: 16 }} />
          ) : faqs.length === 0 ? (
            <Text style={styles.muted}>{t("faqEmpty")}</Text>
          ) : (
            <View style={styles.topicsBlock}>
              {faqs.map((cat) => {
                const name =
                  getFaqTranslation(cat.translations, lang, "name") || "—";
                const isOpen = openCategories.has(cat.id);
                const items = cat.items || [];
                return (
                  <View key={cat.id} style={styles.accordionCard}>
                    <TouchableOpacity
                      style={styles.catAccordionHead}
                      onPress={() => toggleCategory(cat.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="help-circle-outline"
                        size={22}
                        color="#111"
                        style={styles.catAccordionIcon}
                      />
                      <Text style={styles.catAccordionTitle}>{name}</Text>
                      <Ionicons
                        name={isOpen ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#111"
                      />
                    </TouchableOpacity>

                    {isOpen ? (
                      items.length === 0 ? (
                        <Text style={styles.accordionEmpty}>
                          {t("faqEmptyItems")}
                        </Text>
                      ) : (
                        <View style={styles.catAccordionBody}>
                          {items.map((item) => {
                            const question = getFaqTranslation(
                              item.translations,
                              lang,
                              "question",
                            );
                            const answer = getFaqTranslation(
                              item.translations,
                              lang,
                              "answer",
                            );
                            const open = expandedFaqItemId === item.id;
                            return (
                              <FaqAccordionRow
                                key={item.id}
                                question={question}
                                answer={answer}
                                open={open}
                                onToggle={() =>
                                  setExpandedFaqItemId(open ? null : item.id)
                                }
                                item={item}
                                watchLabel={t("watchVideo")}
                                onWatchVideo={onWatchVideo}
                              />
                            );
                          })}
                        </View>
                      )
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      <View style={styles.supportCard}>
        <Text style={styles.supportCardTitle}>{t("faqSupportHint")}</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={onGetSupport}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>{t("getSupport")}</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function FaqAccordionRow({
  question,
  answer,
  open,
  onToggle,
  item,
  watchLabel,
  onWatchVideo,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
  item: HelpdeskFaqItem;
  watchLabel: string;
  onWatchVideo: (item: HelpdeskFaqItem) => void;
}) {
  const hasVideo =
    !!item.hasVideo || (item.videos && item.videos.length > 0);

  return (
    <View style={styles.faqRow}>
      <TouchableOpacity
        style={styles.faqRowHead}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color="#111"
          style={{ marginTop: 2 }}
        />
        <Text style={styles.faqRowQuestion}>{question}</Text>
        {hasVideo ? (
          <TouchableOpacity
            style={styles.watchPill}
            onPress={() => onWatchVideo(item)}
            hitSlop={6}
          >
            <Ionicons name="play" size={10} color="rgba(0,0,0,0.7)" />
            <Text style={styles.watchPillText}>{watchLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
      {open ? (
        <View style={styles.faqRowAnswer}>
          {answer ? (
            <HtmlContent
              html={answer}
              style={{ color: "#221f1f", fontSize: 14 }}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

type TicketForm = {
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

function SupportInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
  editable = true,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
  maxLength?: number;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(52, 61, 72, 0.4)"
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        editable={editable}
        maxLength={maxLength}
        style={[
          styles.inputBox,
          multiline && styles.inputBoxMultiline,
          !editable && styles.inputBoxLocked,
        ]}
      />
    </View>
  );
}

function FormView({
  t,
  bottomPad,
  form,
  setForm,
  lockEmail,
  sending,
  onSubmit,
  goBack,
}: {
  t: (k: HelpdeskStringKey) => string;
  bottomPad: number;
  form: TicketForm;
  setForm: Dispatch<SetStateAction<TicketForm>>;
  lockEmail: boolean;
  sending: boolean;
  onSubmit: () => void;
  goBack: () => void;
}) {
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{
        paddingHorizontal: PAGE_GUTTER,
        paddingTop: 12,
        paddingBottom: bottomPad,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity style={styles.backRow} onPress={goBack} hitSlop={8}>
        <Ionicons name="chevron-back" size={20} color={AppColors.cardText} />
        <Text style={styles.backLabel}>{t("goBack")}</Text>
      </TouchableOpacity>

      <Text style={styles.pageTitle}>{t("getSupport")}</Text>
      <Text style={styles.pageSubtitle}>{t("faqSupportHint")}</Text>

      <View style={styles.formCard}>
        <SupportInput
          label={t("fullName")}
          value={form.fullName}
          onChangeText={(fullName) => setForm((f) => ({ ...f, fullName }))}
          maxLength={WIDGET_LIMITS.fullName}
          autoCapitalize="words"
        />
        <SupportInput
          label={t("email")}
          value={form.email}
          onChangeText={(email) => setForm((f) => ({ ...f, email }))}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!lockEmail}
          maxLength={WIDGET_LIMITS.email}
        />
        <SupportInput
          label={t("phone")}
          value={form.phone}
          onChangeText={(phone) => setForm((f) => ({ ...f, phone }))}
          keyboardType="phone-pad"
          maxLength={WIDGET_LIMITS.phone}
        />
        <SupportInput
          label={t("subject")}
          value={form.subject}
          onChangeText={(subject) => setForm((f) => ({ ...f, subject }))}
          maxLength={WIDGET_LIMITS.subject}
        />
        <SupportInput
          label={t("message")}
          value={form.message}
          onChangeText={(message) => setForm((f) => ({ ...f, message }))}
          multiline
          maxLength={WIDGET_LIMITS.message}
          placeholder={t("chatPlaceholder")}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.primaryBtn,
          styles.primaryBtnFull,
          sending && styles.btnDisabled,
        ]}
        onPress={onSubmit}
        disabled={sending}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>
          {sending ? "..." : t("send")}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ChatView({
  t,
  bottomPad,
  listRef,
  messages,
  chatDraft,
  setChatDraft,
  sending,
  awaitingStaff,
  showResolveChip,
  ticketStatus,
  countdownLabel,
  onSend,
  onResolve,
}: {
  t: (k: HelpdeskStringKey) => string;
  bottomPad: number;
  listRef: RefObject<FlatList<HelpdeskMessage> | null>;
  messages: HelpdeskMessage[];
  chatDraft: string;
  setChatDraft: (v: string) => void;
  sending: boolean;
  awaitingStaff: boolean;
  showResolveChip: boolean;
  ticketStatus: string | null;
  countdownLabel: string | null;
  onSend: () => void;
  onResolve: () => void;
}) {
  return (
    <View style={styles.flex}>
      <View style={styles.chatHeader}>
        <Text style={styles.chatHeaderTitle}>{t("support")}</Text>
        {ticketStatus === "ON_HOLD" ? (
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>
              {t("onHoldHint").split(".")[0]}
            </Text>
          </View>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: PAGE_GUTTER,
          paddingTop: 12,
          paddingBottom: 16,
          flexGrow: 1,
        }}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubbleWrap,
              item.isStaff ? styles.bubbleStaffWrap : styles.bubbleUserWrap,
            ]}
          >
            <View
              style={[
                styles.bubble,
                item.isStaff ? styles.bubbleStaff : styles.bubbleUser,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  item.isStaff ? styles.bubbleStaffText : styles.bubbleUserText,
                ]}
              >
                {item.message}
              </Text>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View>
            {awaitingStaff ? (
              <View style={styles.hintBubble}>
                <Text style={styles.hintText}>{t("awaitStaffHint")}</Text>
              </View>
            ) : null}
            {countdownLabel ? (
              <Text style={styles.countdown}>{countdownLabel}</Text>
            ) : null}
            {showResolveChip ? (
              <TouchableOpacity
                style={styles.resolveChip}
                onPress={onResolve}
                disabled={sending}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                <Text style={styles.resolveChipText}>{t("resolveBtn")}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />

      <View
        style={[
          styles.chatInputBar,
          { paddingBottom: Math.max(bottomPad * 0.55, 12) },
        ]}
      >
        <TextInput
          style={styles.chatInput}
          value={chatDraft}
          onChangeText={setChatDraft}
          placeholder={t("chatPlaceholder")}
          placeholderTextColor="rgba(52,61,72,0.4)"
          maxLength={WIDGET_LIMITS.message}
          editable={!sending && ticketStatus !== "ON_HOLD"}
          onSubmitEditing={onSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (sending || !chatDraft.trim()) && styles.btnDisabled,
          ]}
          onPress={onSend}
          disabled={sending || !chatDraft.trim()}
          activeOpacity={0.85}
        >
          <Ionicons name="send" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SurveyView({
  t,
  bottomPad,
  rating,
  setRating,
  comment,
  setComment,
  sending,
  onSubmit,
  onSkip,
}: {
  t: (k: HelpdeskStringKey) => string;
  bottomPad: number;
  rating: number;
  setRating: (n: number) => void;
  comment: string;
  setComment: (v: string) => void;
  sending: boolean;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: PAGE_GUTTER,
        paddingTop: 28,
        paddingBottom: bottomPad,
        alignItems: "center",
      }}
    >
      <View style={styles.surveyCard}>
        <Text style={styles.surveyTitle}>{t("surveyTitle")}</Text>
        <Text style={styles.surveySub}>{t("surveySubtitle")}</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={6}>
              <Ionicons
                name={rating >= n ? "star" : "star-outline"}
                size={36}
                color={
                  rating >= n ? AppColors.secondary : "rgba(52,61,72,0.3)"
                }
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.surveyLabel}>{t("surveyCommentLabel")}</Text>
        <TextInput
          style={styles.surveyComment}
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={WIDGET_LIMITS.message}
        />
        <View style={styles.surveyActions}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onSkip}>
            <Text style={styles.secondaryBtnText}>{t("surveySkip")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              styles.surveySubmit,
              sending && styles.btnDisabled,
            ]}
            onPress={onSubmit}
            disabled={sending}
          >
            <Text style={styles.primaryBtnText}>{t("surveySubmit")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function ResolvedView({
  t,
  bottomPad,
  closeReason,
  onNew,
}: {
  t: (k: HelpdeskStringKey) => string;
  bottomPad: number;
  closeReason: "session" | "resolved" | "closed" | null;
  onNew: () => void;
}) {
  const text =
    closeReason === "session"
      ? t("sessionClosedText")
      : closeReason === "closed"
        ? t("closedText")
        : t("resolvedText");

  return (
    <View
      style={[
        styles.centered,
        { paddingHorizontal: PAGE_GUTTER, paddingBottom: bottomPad },
      ]}
    >
      <View style={styles.resolvedIcon}>
        <Ionicons name="checkmark" size={28} color={AppColors.accent} />
      </View>
      <Text style={styles.resolvedText}>{text}</Text>
      <TouchableOpacity
        style={[styles.primaryBtn, styles.primaryBtnFull]}
        onPress={onNew}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>{t("newTicketBtn")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  flex: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notice: {
    marginHorizontal: PAGE_GUTTER,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: "rgba(174, 37, 109, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noticeText: {
    flex: 1,
    color: AppColors.accent,
    fontFamily: "PoppinsMedium",
    fontSize: 13,
    lineHeight: 18,
  },
  pageTitle: {
    color: "#111",
    fontFamily: "PoppinsBold",
    fontSize: 22,
    marginBottom: 6,
    textAlign: "center",
  },
  pageSubtitle: {
    color: "rgba(0,0,0,0.65)",
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.35)",
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 4,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    color: "#111",
    paddingVertical: 8,
  },
  muted: {
    color: "rgba(0,0,0,0.5)",
    fontFamily: "PoppinsRegular",
    fontSize: 13,
    marginVertical: 12,
    textAlign: "center",
  },
  popularParagraph: {
    textAlign: "center",
    fontFamily: "PoppinsRegular",
    fontSize: 15,
    lineHeight: 28,
    color: "rgba(0,0,0,0.7)",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  popularLabel: {
    fontFamily: "PoppinsBold",
    color: "#000",
  },
  popularLink: {
    fontFamily: "PoppinsRegular",
    color: "rgba(0,0,0,0.7)",
    textDecorationLine: "underline",
  },
  topicsBlock: {
    gap: 12,
  },
  accordionCard: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.4)",
    paddingHorizontal: 12,
    paddingTop: 4,
    marginBottom: 0,
    overflow: "hidden",
  },
  catAccordionHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.25)",
    gap: 10,
  },
  catAccordionIcon: {
    marginLeft: 2,
  },
  catAccordionTitle: {
    flex: 1,
    color: "#000",
    fontFamily: "PoppinsSemiBold",
    fontSize: 16,
    lineHeight: 22,
  },
  catAccordionBody: {
    paddingBottom: 4,
  },
  accordionEmpty: {
    color: "rgba(0,0,0,0.5)",
    fontFamily: "PoppinsRegular",
    fontSize: 13,
    paddingVertical: 14,
    textAlign: "center",
  },
  faqRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  faqRowHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 12,
  },
  faqRowQuestion: {
    flex: 1,
    color: "#000",
    fontFamily: "PoppinsSemiBold",
    fontSize: 15,
    lineHeight: 22,
  },
  faqRowAnswer: {
    paddingLeft: 24,
    paddingBottom: 12,
    paddingRight: 4,
  },
  watchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.35)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 1,
  },
  watchPillText: {
    color: "rgba(0,0,0,0.7)",
    fontFamily: "PoppinsSemiBold",
    fontSize: 11,
  },
  supportCard: {
    marginTop: 24,
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.35)",
    padding: 18,
    alignItems: "center",
  },
  supportCardTitle: {
    color: "#111",
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 14,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  backLabel: {
    color: "#111",
    fontFamily: "PoppinsMedium",
    fontSize: 15,
  },
  formCard: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    marginBottom: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: AppColors.heading,
    fontFamily: "PoppinsSemiBold",
    fontSize: 13,
  },
  inputBox: {
    backgroundColor: AppColors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(52, 61, 72, 0.12)",
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 13 : 11,
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    color: AppColors.cardText,
  },
  inputBoxMultiline: {
    minHeight: 110,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  inputBoxLocked: {
    opacity: 0.7,
    backgroundColor: "rgba(52, 61, 72, 0.06)",
  },
  primaryBtn: {
    backgroundColor: AppColors.accent,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnFull: {
    alignSelf: "stretch",
    marginTop: 0,
  },
  primaryBtnText: {
    color: "#FFF",
    fontFamily: "PoppinsSemiBold",
    fontSize: 15,
  },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 18,
    backgroundColor: "rgba(52,61,72,0.08)",
  },
  secondaryBtnText: {
    color: AppColors.heading,
    fontFamily: "PoppinsSemiBold",
    fontSize: 15,
  },
  btnDisabled: { opacity: 0.5 },
  chatHeader: {
    paddingHorizontal: PAGE_GUTTER,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(52,61,72,0.12)",
    backgroundColor: AppColors.cardBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  chatHeaderTitle: {
    color: AppColors.heading,
    fontFamily: "PoppinsSemiBold",
    fontSize: 16,
  },
  statusPill: {
    backgroundColor: "rgba(174, 37, 109, 0.1)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    color: AppColors.accent,
    fontFamily: "PoppinsMedium",
    fontSize: 11,
  },
  bubbleWrap: { marginBottom: 10, maxWidth: "82%" },
  bubbleStaffWrap: { alignSelf: "flex-start" },
  bubbleUserWrap: { alignSelf: "flex-end" },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleStaff: {
    backgroundColor: AppColors.cardBg,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: AppColors.accent,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleStaffText: { color: AppColors.cardText },
  bubbleUserText: { color: "#FFF" },
  hintBubble: {
    alignSelf: "stretch",
    backgroundColor: "rgba(15,33,55,0.05)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  hintText: {
    color: "rgba(52,61,72,0.7)",
    fontFamily: "PoppinsRegular",
    fontSize: 13,
    lineHeight: 18,
  },
  countdown: {
    color: AppColors.accent,
    fontFamily: "PoppinsMedium",
    fontSize: 12,
    marginBottom: 8,
  },
  resolveChip: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: AppColors.heading,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  resolveChipText: {
    color: "#FFF",
    fontFamily: "PoppinsMedium",
    fontSize: 13,
  },
  chatInputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: PAGE_GUTTER,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(52,61,72,0.12)",
    backgroundColor: AppColors.cardBg,
  },
  chatInput: {
    flex: 1,
    backgroundColor: AppColors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    color: AppColors.cardText,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: AppColors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  surveyCard: {
    alignSelf: "stretch",
    backgroundColor: AppColors.cardBg,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
  },
  surveyTitle: {
    color: AppColors.heading,
    fontFamily: "PoppinsBold",
    fontSize: 20,
    textAlign: "center",
  },
  surveySub: {
    color: "rgba(52,61,72,0.65)",
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    marginTop: 6,
    marginBottom: 18,
    textAlign: "center",
  },
  stars: { flexDirection: "row", gap: 8, marginBottom: 20 },
  surveyLabel: {
    alignSelf: "stretch",
    color: AppColors.heading,
    fontFamily: "PoppinsMedium",
    fontSize: 13,
    marginBottom: 8,
  },
  surveyComment: {
    alignSelf: "stretch",
    minHeight: 100,
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: 12,
    fontFamily: "PoppinsRegular",
    fontSize: 14,
    color: AppColors.cardText,
    textAlignVertical: "top",
  },
  surveyActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    alignSelf: "stretch",
  },
  surveySubmit: { flex: 1 },
  resolvedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(174, 37, 109, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  resolvedText: {
    color: "rgba(52,61,72,0.75)",
    fontFamily: "PoppinsRegular",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 20,
    maxWidth: 280,
  },
});
