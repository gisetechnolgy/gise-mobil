import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import type { AuthUser } from '../authTypes';
import {
  createSession,
  createTicket,
  getConfig,
  getFaqs,
  getThread,
  HelpdeskApiError,
  replyToThread,
  resolveThread,
  searchFaqs,
  submitSurvey,
} from './api';
import { HELPDESK_API_BASE, SESSION_TIMEOUT_MS } from './config';
import { hdT, mapHelpdeskError } from './strings';
import * as storage from './storage';
import type {
  ConversationPayload,
  HelpdeskConfig,
  HelpdeskFaqCategory,
  HelpdeskLang,
  HelpdeskMessage,
  HelpdeskUserPrefill,
  HelpdeskView,
  SurveyContext,
  TicketStatus,
} from './types';

function buildUserFromAuth(user: AuthUser | null): HelpdeskUserPrefill | null {
  if (!user) return null;
  return {
    email: user.email || '',
    fullName: user.fullName || '',
    phone: user.phoneNumber || '',
    lockEmail: !!user.email,
  };
}

function threadHasStaffReply(messages: HelpdeskMessage[]): boolean {
  return messages.some((m) => m.isStaff && !m.isInternal);
}

export function useHelpdeskSupport(
  authUser: AuthUser | null,
  lang: HelpdeskLang,
) {
  const [booting, setBooting] = useState(true);
  const [view, setView] = useState<HelpdeskView>('faq');
  const [config, setConfig] = useState<HelpdeskConfig | null>(null);
  const [visitorId, setVisitorId] = useState<string>('');
  const [user, setUser] = useState<HelpdeskUserPrefill>({
    email: '',
    fullName: '',
    phone: '',
    lockEmail: false,
  });
  const [formStartTime, setFormStartTime] = useState(Date.now());
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketHash, setTicketHash] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = useState<TicketStatus | null>(null);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [assignedToName, setAssignedToName] = useState<string | null>(null);
  const [messages, setMessages] = useState<HelpdeskMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [closeReason, setCloseReason] = useState<
    'session' | 'resolved' | 'closed' | null
  >(null);
  const [surveyContext, setSurveyContext] = useState<SurveyContext | null>(
    null,
  );
  const [surveyRating, setSurveyRating] = useState(0);
  const [surveyComment, setSurveyComment] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [countdownLabel, setCountdownLabel] = useState<string | null>(null);

  const [faqs, setFaqs] = useState<HelpdeskFaqCategory[]>([]);
  const [faqsLoading, setFaqsLoading] = useState(false);
  const [selectedFaqCategoryId, setSelectedFaqCategoryId] = useState<
    string | null
  >(null);
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [faqSearchResults, setFaqSearchResults] = useState<
    HelpdeskFaqCategory[]
  >([]);
  const [faqSearchLoading, setFaqSearchLoading] = useState(false);
  const [expandedFaqItemId, setExpandedFaqItemId] = useState<string | null>(
    null,
  );

  const socketRef = useRef<Socket | null>(null);
  const faqSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticketRef = useRef({
    ticketId: null as string | null,
    ticketHash: null as string | null,
    accessToken: null as string | null,
  });

  useEffect(() => {
    ticketRef.current = { ticketId, ticketHash, accessToken };
  }, [ticketId, ticketHash, accessToken]);

  const showNotice = useCallback((text: string) => {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 5000);
  }, []);

  const applyConversation = useCallback(async (data: ConversationPayload) => {
    setTicketId(data.ticketId);
    setTicketHash(data.ticketHash);
    setTicketStatus(data.status || 'OPEN');
    setAccessToken(data.accessToken);
    setAssignedTo(data.assignedTo ?? null);
    setAssignedToName(data.assignedToName ?? null);
    setMessages(data.messages || []);
    if (data.ticketId && data.ticketHash && data.accessToken) {
      await storage.saveChat({
        ticketId: data.ticketId,
        ticketHash: data.ticketHash,
        accessToken: data.accessToken,
      });
    }
  }, []);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const handleTicketClosed = useCallback(
    async (data: {
      status?: string;
      closeReason?: string;
      ticket?: {
        assignedTo?: string | null;
        assignedToName?: string | null;
        ticketHash?: string;
      };
    }) => {
      const snapshot = data.ticket || {};
      const assigneeId = snapshot.assignedTo || assignedTo;
      const assigneeName =
        snapshot.assignedToName || assignedToName || undefined;
      const surveyTicketHash = ticketHash || snapshot.ticketHash;
      const surveyToken = accessToken;
      const hasStaff = threadHasStaffReply(messages) || !!assigneeId;

      let reason: 'session' | 'resolved' | 'closed' = 'closed';
      if (data.closeReason === 'widget_inactivity' || sessionExpired) {
        reason = 'session';
      } else if (data.status === 'RESOLVED') {
        reason = 'resolved';
      }
      setCloseReason(reason);
      setSessionExpired(false);

      const showSurvey =
        (data.status === 'RESOLVED' || data.status === 'CLOSED') &&
        !!surveyTicketHash &&
        !!surveyToken &&
        hasStaff;

      if (showSurvey && surveyTicketHash && surveyToken) {
        const ctx: SurveyContext = {
          ticketHash: surveyTicketHash,
          accessToken: surveyToken,
          assignedToName: assigneeName,
        };
        setSurveyContext(ctx);
        await storage.savePendingSurvey(ctx);
      } else {
        setSurveyContext(null);
        await storage.clearPendingSurvey();
      }

      disconnectSocket();
      setTicketId(null);
      setTicketHash(null);
      setTicketStatus(null);
      setAccessToken(null);
      setAssignedTo(null);
      setAssignedToName(null);
      setMessages([]);
      setSurveyRating(0);
      setSurveyComment('');
      await storage.clearChat();
      setView(showSurvey ? 'survey' : 'resolved');
    },
    [
      accessToken,
      assignedTo,
      assignedToName,
      disconnectSocket,
      messages,
      sessionExpired,
      ticketHash,
    ],
  );

  const connectSocket = useCallback(() => {
    const { ticketId: tid, ticketHash: th, accessToken: tok } =
      ticketRef.current;
    if (!tid || !tok) return;
    if (socketRef.current?.connected) return;

    disconnectSocket();

    const socket = io(`${HELPDESK_API_BASE}/tickets`, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 15,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join', {
        ticketId: tid,
        ticketHash: th,
        accessToken: tok,
      });
    });

    socket.on('message:new', (payload: { message?: HelpdeskMessage }) => {
      const msg = payload?.message;
      if (!msg || msg.isInternal) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (msg.isStaff) {
        if (msg.staffId) setAssignedTo((a) => a || msg.staffId || null);
        if (msg.staffName) {
          setAssignedToName((n) => n || msg.staffName || null);
        }
      }
    });

    socket.on(
      'ticket:updated',
      (data: {
        status?: string;
        closeReason?: string;
        ticket?: {
          assignedTo?: string | null;
          assignedToName?: string | null;
          ticketHash?: string;
        };
      }) => {
        if (data.ticket?.assignedTo) setAssignedTo(data.ticket.assignedTo);
        if (data.ticket?.assignedToName) {
          setAssignedToName(data.ticket.assignedToName);
        }
        if (data.status === 'ON_HOLD') {
          setTicketStatus('ON_HOLD');
          return;
        }
        if (data.status === 'OPEN') {
          setTicketStatus('OPEN');
          return;
        }
        if (
          data.status &&
          data.status !== 'OPEN' &&
          data.status !== 'ON_HOLD'
        ) {
          void handleTicketClosed(data);
        }
      },
    );
  }, [disconnectSocket, handleTicketClosed]);

  const loadFaqList = useCallback(async () => {
    setFaqsLoading(true);
    try {
      const list = await getFaqs();
      setFaqs(Array.isArray(list) ? list : []);
    } catch {
      setFaqs([]);
    } finally {
      setFaqsLoading(false);
    }
  }, []);

  const startNewConversation = useCallback(async () => {
    disconnectSocket();
    setTicketId(null);
    setTicketHash(null);
    setTicketStatus(null);
    setAccessToken(null);
    setAssignedTo(null);
    setAssignedToName(null);
    setMessages([]);
    setCloseReason(null);
    setSurveyContext(null);
    setSurveyRating(0);
    setSurveyComment('');
    setSessionExpired(false);
    setSelectedFaqCategoryId(null);
    setFaqSearchQuery('');
    setFaqSearchResults([]);
    setExpandedFaqItemId(null);
    setFormStartTime(Date.now());
    setForm((f) => ({ ...f, subject: '', message: '' }));
    await storage.clearChat();
    await storage.clearPendingSurvey();
    setView('faq');
    void loadFaqList();
  }, [disconnectSocket, loadFaqList]);

  const goToSupportForm = useCallback(() => {
    setFormStartTime(Date.now());
    setView('form');
  }, []);

  const goToFaq = useCallback(() => {
    setSelectedFaqCategoryId(null);
    setFaqSearchQuery('');
    setFaqSearchResults([]);
    setExpandedFaqItemId(null);
    setView('faq');
    void loadFaqList();
  }, [loadFaqList]);

  // Boot + session restore
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const vid = await storage.getOrCreateVisitorId();
        if (cancelled) return;
        setVisitorId(vid);

        const cachedUser = await storage.loadUserPrefill();
        const fromAuth = buildUserFromAuth(authUser);
        const merged: HelpdeskUserPrefill = {
          email: fromAuth?.email || cachedUser?.email || '',
          fullName: fromAuth?.fullName || cachedUser?.fullName || '',
          phone: fromAuth?.phone || cachedUser?.phone || '',
          lockEmail: !!(fromAuth?.email || cachedUser?.lockEmail),
        };
        setUser(merged);
        setForm({
          fullName: merged.fullName,
          email: merged.email,
          phone: merged.phone,
          subject: '',
          message: '',
        });

        const cfg = await getConfig();
        if (cancelled) return;
        setConfig(cfg);

        const session = await createSession(vid);
        if (cancelled) return;
        if (session.visitorId) {
          await storage.saveVisitorId(session.visitorId);
          setVisitorId(session.visitorId);
        }

        if (session.hasConversation && session.ticketId && session.accessToken) {
          await applyConversation(session);
          setView('chat');
          return;
        }

        const pending = await storage.loadPendingSurvey();
        if (pending?.ticketHash && pending.accessToken) {
          const skipped = await storage.isSurveySkipped(pending.ticketHash);
          if (!skipped) {
            setSurveyContext(pending);
            setView('survey');
            return;
          }
          await storage.clearPendingSurvey();
        }

        const cached = await storage.loadChat();
        if (cached?.ticketHash && cached.accessToken) {
          try {
            const thread = await getThread(
              cached.ticketHash,
              cached.accessToken,
            );
            if (thread.status === 'OPEN' || thread.status === 'ON_HOLD') {
              await applyConversation({
                ...thread,
                ticketId: cached.ticketId,
                ticketHash: cached.ticketHash,
                accessToken: cached.accessToken,
              });
              setView('chat');
              return;
            }
            if (
              (thread.status === 'RESOLVED' || thread.status === 'CLOSED') &&
              (thread.assignedTo ||
                threadHasStaffReply(thread.messages || [])) &&
              !(await storage.isSurveySkipped(cached.ticketHash))
            ) {
              const ctx: SurveyContext = {
                ticketHash: cached.ticketHash,
                accessToken: cached.accessToken,
                assignedToName: thread.assignedToName || '',
              };
              setSurveyContext(ctx);
              await storage.savePendingSurvey(ctx);
              setCloseReason(
                thread.status === 'RESOLVED' ? 'resolved' : 'closed',
              );
              await storage.clearChat();
              setView('survey');
              return;
            }
            await storage.clearChat();
          } catch {
            await storage.clearChat();
          }
        }

        setView('faq');
        void loadFaqList();
      } catch (e) {
        console.warn('[Helpdesk] boot failed', e);
        setView('faq');
        void loadFaqList();
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
      disconnectSocket();
      if (faqSearchTimer.current) clearTimeout(faqSearchTimer.current);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot once on mount
  }, []);

  // Sync auth user → form prefill
  useEffect(() => {
    const fromAuth = buildUserFromAuth(authUser);
    if (!fromAuth) return;
    setUser(fromAuth);
    setForm((f) => ({
      ...f,
      fullName: fromAuth.fullName || f.fullName,
      email: fromAuth.email || f.email,
      phone: fromAuth.phone || f.phone,
    }));
    void storage.saveUserPrefill(fromAuth);
  }, [authUser]);

  // Socket when in chat
  useEffect(() => {
    if (view === 'chat' && ticketId && accessToken) {
      connectSocket();
    }
    return () => {
      if (view !== 'chat') disconnectSocket();
    };
  }, [view, ticketId, accessToken, connectSocket, disconnectSocket]);

  // Session countdown
  useEffect(() => {
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
    if (view !== 'chat' || ticketStatus !== 'OPEN' || !messages.length) {
      setCountdownLabel(null);
      return;
    }
    const last = messages[messages.length - 1];
    if (!last?.isStaff) {
      setCountdownLabel(null);
      return;
    }

    const tick = () => {
      const deadline = new Date(last.createdAt).getTime() + SESSION_TIMEOUT_MS;
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        setSessionExpired(true);
        setCountdownLabel(hdT(lang, 'sessionClosing'));
        if (countdownTimer.current) clearInterval(countdownTimer.current);
        return;
      }
      const totalSec = Math.ceil(remaining / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      const time = `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
      setCountdownLabel(hdT(lang, 'sessionCountdown').replace('{time}', time));
    };

    tick();
    countdownTimer.current = setInterval(tick, 1000);
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, [view, ticketStatus, messages, lang]);

  // Refresh thread when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const { ticketHash: th, accessToken: tok } = ticketRef.current;
      if (!th || !tok || view !== 'chat') return;
      void getThread(th, tok)
        .then((thread) => {
          if (thread.status === 'OPEN' || thread.status === 'ON_HOLD') {
            setTicketStatus(thread.status);
            setMessages(thread.messages || []);
            setAssignedTo(thread.assignedTo ?? null);
            setAssignedToName(thread.assignedToName ?? null);
          } else if (
            thread.status === 'RESOLVED' ||
            thread.status === 'CLOSED'
          ) {
            void handleTicketClosed({
              status: thread.status,
              ticket: {
                assignedTo: thread.assignedTo,
                assignedToName: thread.assignedToName,
                ticketHash: th,
              },
            });
          }
        })
        .catch(() => undefined);
    });
    return () => sub.remove();
  }, [view, handleTicketClosed]);

  const onFaqSearch = useCallback((q: string) => {
    setFaqSearchQuery(q);
    if (faqSearchTimer.current) clearTimeout(faqSearchTimer.current);
    const trimmed = q.trim();
    if (!trimmed) {
      setFaqSearchResults([]);
      setFaqSearchLoading(false);
      return;
    }
    setFaqSearchLoading(true);
    faqSearchTimer.current = setTimeout(() => {
      void searchFaqs(trimmed)
        .then((res) => setFaqSearchResults(Array.isArray(res) ? res : []))
        .catch(() => setFaqSearchResults([]))
        .finally(() => setFaqSearchLoading(false));
    }, 350);
  }, []);

  const submitTicket = useCallback(async () => {
    if (sending) return;
    const fullName = form.fullName.trim();
    const email = form.email.trim();
    const subject = form.subject.trim();
    const message = form.message.trim();
    if (!fullName || !email || !subject || !message) {
      Alert.alert(hdT(lang, 'support'), hdT(lang, 'requiredFields'));
      return;
    }

    setSending(true);
    try {
      const data = await createTicket({
        visitorId,
        fullName,
        email,
        phone: form.phone,
        subject,
        message,
        language: lang,
        formStartTime,
      });
      await storage.saveUserPrefill({
        email,
        fullName,
        phone: form.phone,
        lockEmail: user.lockEmail,
      });
      setUser((u) => ({ ...u, email, fullName, phone: form.phone }));
      await applyConversation(data);
      setForm((f) => ({ ...f, subject: '', message: '' }));
      setView('chat');
    } catch (e) {
      const err = e as HelpdeskApiError;
      showNotice(mapHelpdeskError(lang, err.message, err.statusCode));
    } finally {
      setSending(false);
    }
  }, [
    applyConversation,
    form,
    formStartTime,
    lang,
    sending,
    showNotice,
    user.lockEmail,
    visitorId,
  ]);

  const sendChat = useCallback(async () => {
    if (sending || !ticketHash || !accessToken) return;
    const text = chatDraft.trim();
    if (!text) return;
    setSending(true);
    try {
      const msg = await replyToThread(ticketHash, accessToken, text);
      setChatDraft('');
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
    } catch (e) {
      const err = e as HelpdeskApiError;
      showNotice(mapHelpdeskError(lang, err.message, err.statusCode));
    } finally {
      setSending(false);
    }
  }, [accessToken, chatDraft, lang, sending, showNotice, ticketHash]);

  const confirmResolve = useCallback(() => {
    Alert.alert(
      hdT(lang, 'resolveConfirmTitle'),
      hdT(lang, 'resolveConfirmText'),
      [
        { text: hdT(lang, 'resolveConfirmNo'), style: 'cancel' },
        {
          text: hdT(lang, 'resolveConfirmYes'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (!ticketHash || !accessToken || sending) return;
              setSending(true);
              try {
                const resolveText = hdT(lang, 'resolveBtn');
                const msg = await replyToThread(
                  ticketHash,
                  accessToken,
                  resolveText,
                );
                setMessages((prev) =>
                  prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
                );
                await resolveThread(ticketHash, accessToken);
                await handleTicketClosed({
                  status: 'RESOLVED',
                  ticket: {
                    assignedTo,
                    assignedToName,
                    ticketHash,
                  },
                });
              } catch (e) {
                const err = e as HelpdeskApiError;
                showNotice(
                  mapHelpdeskError(lang, err.message, err.statusCode),
                );
              } finally {
                setSending(false);
              }
            })();
          },
        },
      ],
    );
  }, [
    accessToken,
    assignedTo,
    assignedToName,
    handleTicketClosed,
    lang,
    sending,
    showNotice,
    ticketHash,
  ]);

  const finishSurvey = useCallback(
    async (skipped: boolean) => {
      if (skipped && surveyContext?.ticketHash) {
        await storage.markSurveySkipped(surveyContext.ticketHash);
      }
      await storage.clearPendingSurvey();
      setSurveyContext(null);
      setSurveyRating(0);
      setSurveyComment('');
      setView('resolved');
    },
    [surveyContext],
  );

  const onSubmitSurvey = useCallback(async () => {
    if (!surveyContext || sending) return;
    if (surveyRating < 1 || surveyRating > 5) {
      showNotice(hdT(lang, 'surveySelectRating'));
      return;
    }
    setSending(true);
    try {
      await submitSurvey({
        ticketHash: surveyContext.ticketHash,
        token: surveyContext.accessToken,
        rating: surveyRating,
        comment: surveyComment,
      });
      showNotice(hdT(lang, 'surveyThanks'));
      await finishSurvey(false);
    } catch (e) {
      const err = e as HelpdeskApiError;
      if (String(err.message || '').includes('zaten')) {
        await finishSurvey(false);
        return;
      }
      showNotice(mapHelpdeskError(lang, err.message, err.statusCode));
    } finally {
      setSending(false);
    }
  }, [
    finishSurvey,
    lang,
    sending,
    showNotice,
    surveyComment,
    surveyContext,
    surveyRating,
  ]);

  const awaitingStaff =
    messages.length > 0 &&
    !messages[messages.length - 1]?.isStaff &&
    !threadHasStaffReply(messages);

  const showResolveChip =
    threadHasStaffReply(messages) &&
    !(
      messages.length > 0 &&
      !messages[messages.length - 1]?.isStaff &&
      messages[messages.length - 1]?.message === hdT(lang, 'resolveBtn')
    );

  return {
    booting,
    view,
    config,
    user,
    form,
    setForm,
    sending,
    notice,
    messages,
    chatDraft,
    setChatDraft,
    ticketStatus,
    countdownLabel,
    closeReason,
    surveyRating,
    setSurveyRating,
    surveyComment,
    setSurveyComment,
    faqs,
    faqsLoading,
    selectedFaqCategoryId,
    setSelectedFaqCategoryId,
    faqSearchQuery,
    onFaqSearch,
    faqSearchResults,
    faqSearchLoading,
    expandedFaqItemId,
    setExpandedFaqItemId,
    awaitingStaff,
    showResolveChip,
    goToSupportForm,
    goToFaq,
    startNewConversation,
    submitTicket,
    sendChat,
    confirmResolve,
    onSubmitSurvey,
    finishSurvey,
    loadFaqList,
  };
}
