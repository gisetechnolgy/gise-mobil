export type HelpdeskView =
  | 'faq'
  | 'form'
  | 'chat'
  | 'survey'
  | 'resolved';

export type HelpdeskLang = 'tr' | 'en';

export type TicketStatus =
  | 'OPEN'
  | 'ON_HOLD'
  | 'RESOLVED'
  | 'CLOSED'
  | string;

export interface HelpdeskConfig {
  scriptKey: string;
  themeColor?: string;
  channel?: 'CUSTOMER' | 'BUSINESS' | string;
  projectId?: string;
  projectName?: string;
  projectSlug?: string;
  logoUrl?: string | null;
}

export interface HelpdeskMessage {
  id: string;
  message: string;
  isStaff: boolean;
  isInternal?: boolean;
  createdAt: string;
  staffId?: string | null;
  staffName?: string | null;
}

export interface HelpdeskFaqVideo {
  id: string;
  type?: string;
  youtubeId?: string | null;
  videoUrl?: string | null;
  title?: string | null;
}

export interface HelpdeskFaqItem {
  id: string;
  translations: Record<string, { question?: string; answer?: string }>;
  isPopular?: boolean;
  hasVideo?: boolean;
  videos?: HelpdeskFaqVideo[];
}

export interface HelpdeskFaqCategory {
  id: string;
  translations: Record<string, { name?: string }>;
  items: HelpdeskFaqItem[];
}

export interface HelpdeskUserPrefill {
  email: string;
  fullName: string;
  phone: string;
  lockEmail: boolean;
}

export interface CachedChat {
  ticketId: string;
  ticketHash: string;
  accessToken: string;
}

export interface SurveyContext {
  ticketHash: string;
  accessToken: string;
  assignedToName?: string;
}

export interface ConversationPayload {
  visitorId?: string;
  hasConversation?: boolean;
  ticketId: string | null;
  ticketHash: string | null;
  accessToken: string | null;
  status: TicketStatus | null;
  subject?: string;
  assignedTo?: string | null;
  assignedToName?: string | null;
  messages: HelpdeskMessage[];
}
