import {
  HELPDESK_API_BASE,
  HELPDESK_PAGE_URL,
  HELPDESK_SCRIPT_KEY,
  clampWidgetText,
  WIDGET_LIMITS,
} from './config';
import type {
  ConversationPayload,
  HelpdeskConfig,
  HelpdeskFaqCategory,
  HelpdeskLang,
  HelpdeskMessage,
} from './types';

export class HelpdeskApiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${HELPDESK_API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let msg = '__generic__';
    try {
      const err = (await res.json()) as { message?: string | string[] };
      const raw = err?.message;
      msg = Array.isArray(raw) ? raw[0] || msg : raw || msg;
    } catch {
      msg = res.status === 429 ? '__throttle__' : '__generic__';
    }
    throw new HelpdeskApiError(msg, res.status);
  }

  return res.json() as Promise<T>;
}

export function getConfig(): Promise<HelpdeskConfig> {
  return request(
    `/widget/config?key=${encodeURIComponent(HELPDESK_SCRIPT_KEY)}`,
  );
}

export function createSession(
  visitorId: string,
): Promise<ConversationPayload & { visitorId: string }> {
  return request('/widget/session', {
    method: 'POST',
    body: { scriptKey: HELPDESK_SCRIPT_KEY, visitorId },
  });
}

export function getFaqs(): Promise<HelpdeskFaqCategory[]> {
  return request(
    `/widget/faq?key=${encodeURIComponent(HELPDESK_SCRIPT_KEY)}`,
  );
}

export function searchFaqs(q: string): Promise<HelpdeskFaqCategory[]> {
  return request(
    `/widget/faq/search?key=${encodeURIComponent(HELPDESK_SCRIPT_KEY)}&q=${encodeURIComponent(q)}`,
  );
}

export function createTicket(input: {
  visitorId: string;
  fullName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  language: HelpdeskLang;
  formStartTime: number;
}): Promise<ConversationPayload> {
  return request('/widget/tickets', {
    method: 'POST',
    body: {
      scriptKey: HELPDESK_SCRIPT_KEY,
      visitorId: input.visitorId,
      fullName: clampWidgetText(input.fullName, WIDGET_LIMITS.fullName),
      email: clampWidgetText(input.email, WIDGET_LIMITS.email),
      phone: clampWidgetText(input.phone, WIDGET_LIMITS.phone) || undefined,
      subject: clampWidgetText(input.subject, WIDGET_LIMITS.subject),
      message: clampWidgetText(input.message, WIDGET_LIMITS.message),
      pageUrl: HELPDESK_PAGE_URL,
      // Native app — domain allowlist'e takılmasın (hostname yoksa backend kontrol etmez)
      language: input.language,
      honeypot: '',
      formStartTime: input.formStartTime,
    },
  });
}

export function getThread(
  ticketHash: string,
  token: string,
): Promise<ConversationPayload & { status: string }> {
  return request(
    `/widget/thread/${encodeURIComponent(ticketHash)}?key=${encodeURIComponent(HELPDESK_SCRIPT_KEY)}&token=${encodeURIComponent(token)}`,
  );
}

export function replyToThread(
  ticketHash: string,
  token: string,
  message: string,
): Promise<HelpdeskMessage> {
  return request(`/widget/thread/${encodeURIComponent(ticketHash)}/reply`, {
    method: 'POST',
    body: {
      scriptKey: HELPDESK_SCRIPT_KEY,
      message: clampWidgetText(message, WIDGET_LIMITS.message),
      token,
    },
  });
}

export function resolveThread(
  ticketHash: string,
  token: string,
): Promise<unknown> {
  return request(`/widget/thread/${encodeURIComponent(ticketHash)}/resolve`, {
    method: 'POST',
    body: { scriptKey: HELPDESK_SCRIPT_KEY, token },
  });
}

export function submitSurvey(input: {
  ticketHash: string;
  token: string;
  rating: number;
  comment?: string;
}): Promise<unknown> {
  return request('/widget/survey', {
    method: 'POST',
    body: {
      scriptKey: HELPDESK_SCRIPT_KEY,
      ticketHash: input.ticketHash,
      token: input.token,
      rating: input.rating,
      comment: input.comment
        ? clampWidgetText(input.comment, WIDGET_LIMITS.message)
        : undefined,
    },
  });
}
