import type { HelpdeskLang } from './types';

const STRINGS = {
  tr: {
    support: 'Destek',
    fullName: 'Ad Soyad',
    email: 'E-posta',
    phone: 'Telefon',
    subject: 'Konu',
    message: 'Mesaj',
    send: 'Gönder',
    chatPlaceholder: 'Mesajınızı yazın...',
    awaitStaffHint:
      'Talebiniz başarıyla oluşturuldu. En kısa sürede sizinle iletişime geçeceğiz.',
    sessionCountdown:
      'Yanıt vermezseniz oturum {time} içinde sonlandırılacak.',
    sessionClosing: 'Oturum sonlandırılıyor...',
    sessionClosedText:
      '5 dakika içinde yanıt vermediğiniz için oturum sonlandırıldı.',
    closedText: 'Bu destek talebi sonlandırıldı.',
    rateLimitMsg: 'Çok hızlı mesaj gönderiyorsunuz. Lütfen biraz bekleyin.',
    resolvedText: 'Bu destek talebi çözüldü.',
    newTicketBtn: 'Yeni destek talebi aç',
    staffReplyNotice: 'Destek ekibinden yeni mesaj var',
    genericError: 'Bir sorun oluştu. Lütfen daha sonra tekrar deneyin.',
    throttleError:
      'Çok fazla deneme yaptınız. Bir süre bekleyip tekrar deneyin.',
    ticketLimitMsg:
      'Çok fazla destek talebi oluşturdunuz. Lütfen bir süre bekleyip tekrar deneyin.',
    faqPrompt: 'Size nasıl yardımcı olabiliriz?',
    faqSearchPlaceholder: 'Sorunuzu veya aradığınız konuyu yazın',
    faqPopularTopics: 'Popüler konular:',
    faqSearching: 'Aranıyor...',
    faqNoResults: 'Sonuç bulunamadı',
    faqEmpty: 'Henüz kategori eklenmemiş.',
    faqEmptyItems: 'Bu kategoride henüz soru yok.',
    faqSupportHint: 'Hala yanıt bulamadınız mı?',
    getSupport: 'Destek Al',
    goBack: 'Geri dön',
    watchVideo: 'İzle',
    resolveBtn: 'Sorunum çözüldü',
    resolveConfirmTitle: 'Emin misiniz?',
    resolveConfirmText:
      'Evet derseniz destek talebiniz sonlandırılacaktır.',
    resolveConfirmYes: 'Evet',
    resolveConfirmNo: 'Hayır',
    surveyTitle: 'Deneyiminizi değerlendirin',
    surveySubtitle: 'Görüşmenizi puanlayın',
    surveyCommentLabel:
      'Ekip arkadaşımızla ilgili neleri beğendiniz? (isteğe bağlı)',
    surveySubmit: 'Gönder',
    surveySkip: 'Atla',
    surveyThanks: 'Geri bildiriminiz için teşekkürler!',
    surveySelectRating: 'Lütfen 1 ile 5 arasında puan verin',
    requiredFields: 'Lütfen zorunlu alanları doldurun',
    onHoldHint: 'Talebiniz beklemede. Ekibimiz kısa süre içinde dönecek.',
  },
  en: {
    support: 'Support',
    fullName: 'Full name',
    email: 'Email',
    phone: 'Phone',
    subject: 'Subject',
    message: 'Message',
    send: 'Send',
    chatPlaceholder: 'Type your message...',
    awaitStaffHint:
      'Your request has been created successfully. We will contact you shortly.',
    sessionCountdown:
      'If you do not reply, your session will end in {time}.',
    sessionClosing: 'Closing session...',
    sessionClosedText:
      'Your session ended because you did not reply within 5 minutes.',
    closedText: 'This support request has been closed.',
    rateLimitMsg: 'You are sending messages too quickly. Please wait a moment.',
    resolvedText: 'This support request has been resolved.',
    newTicketBtn: 'Start new request',
    staffReplyNotice: 'New message from support',
    genericError: 'Something went wrong. Please try again later.',
    throttleError: 'Too many attempts. Please wait and try again.',
    ticketLimitMsg:
      'You have created too many support requests. Please wait and try again.',
    faqPrompt: 'How can we help you?',
    faqSearchPlaceholder: 'Type your question or topic',
    faqPopularTopics: 'Popular topics:',
    faqSearching: 'Searching...',
    faqNoResults: 'No results found',
    faqEmpty: 'No categories added yet.',
    faqEmptyItems: 'No questions in this category yet.',
    faqSupportHint: "Still couldn't find your answer?",
    getSupport: 'Get Support',
    goBack: 'Go back',
    watchVideo: 'Watch',
    resolveBtn: 'My issue is resolved',
    resolveConfirmTitle: 'Are you sure?',
    resolveConfirmText:
      'If you confirm, your support request will be closed.',
    resolveConfirmYes: 'Yes',
    resolveConfirmNo: 'No',
    surveyTitle: 'Rate your experience',
    surveySubtitle: 'Rate your chat',
    surveyCommentLabel:
      'What did you like about our team member? (optional)',
    surveySubmit: 'Submit',
    surveySkip: 'Skip',
    surveyThanks: 'Thank you for your feedback!',
    surveySelectRating: 'Please select a rating from 1 to 5',
    requiredFields: 'Please fill in all required fields',
    onHoldHint: 'Your request is on hold. Our team will get back shortly.',
  },
} as const;

export type HelpdeskStringKey = keyof (typeof STRINGS)['tr'];

export function hdT(lang: HelpdeskLang, key: HelpdeskStringKey): string {
  return STRINGS[lang]?.[key] || STRINGS.tr[key] || key;
}

export function mapHelpdeskError(
  lang: HelpdeskLang,
  rawMsg: string | undefined,
  statusCode?: number,
): string {
  if (statusCode === 429 || rawMsg === '__throttle__') {
    return hdT(lang, 'throttleError');
  }
  const msg = String(rawMsg || '').trim();
  if (!msg || msg === '__generic__') return hdT(lang, 'genericError');

  const lower = msg.toLowerCase();
  if (
    lower.includes('throttler') ||
    lower.includes('too many request') ||
    lower.includes('çok fazla deneme')
  ) {
    return hdT(lang, 'throttleError');
  }
  if (lower.includes('çok hızlı mesaj') || lower.includes('too quickly')) {
    return hdT(lang, 'rateLimitMsg');
  }
  if (lower.includes('too many tickets')) return hdT(lang, 'ticketLimitMsg');
  if (
    lower.includes('alanları doldurun') ||
    lower.includes('destek talebiniz') ||
    lower.includes('açık bir destek') ||
    lower.includes('mesaj boş') ||
    lower.includes('bir sorun oluştu') ||
    lower.includes('something went wrong')
  ) {
    return msg;
  }
  return hdT(lang, 'genericError');
}

export function getFaqTranslation(
  translations:
    | Record<string, Record<string, string | undefined> | undefined>
    | undefined,
  lang: HelpdeskLang,
  field: string,
): string {
  if (!translations) return '';
  const pack = translations[lang] || translations.tr || translations.en;
  const value = pack?.[field];
  return (typeof value === 'string' ? value : '').trim();
}
