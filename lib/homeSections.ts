import { fetchCollection } from './collections';
import {
  fetchEventById,
  fetchUpcomingEvents,
  isPastEvent,
  type EventItem,
} from './events';
import { fetchVenueById } from './venues';
import { pickImageSrc, pickLocalizedText } from './giseMappers';
import { t } from './i18n';
import {
  fetchEventActivePriceInfo,
  type ActivePriceInfo,
} from './startingPrice';
import { fetchEventRemainingTickets } from './urgencyBadge';

export type HomeSectionEvent = EventItem & {
  featuredImageUrl?: string | null;
  priceInfo?: ActivePriceInfo | null;
  remainingTickets?: number | null;
};

export type HomeSection = {
  id: string;
  title: string;
  order: number;
  category: string | null;
  venueId: string | null;
  events: HomeSectionEvent[];
  seeAllCategory: string | null;
  seeAllVenueId: string | null;
  isCarousel: boolean;
  isFeatured: boolean;
  marquee: boolean;
  bannerUrl: string | null;
  carouselBgColor: string | null;
};

export const CAROUSEL_BG_PRIMARY = '#AE256D';
export const CAROUSEL_BG_NAVY = '#0E1F58';

export function resolveCarouselBgColor(value: string | null | undefined): string {
  if (value === CAROUSEL_BG_NAVY) return CAROUSEL_BG_NAVY;
  return CAROUSEL_BG_PRIMARY;
}

function needsTicketCount(event: HomeSectionEvent): boolean {
  const u = event.urgency;
  if (!u || typeof u !== 'object') return false;
  const v = (u as { ticketsEnabled?: unknown }).ticketsEnabled;
  return v === true || v === 'true' || v === 1 || v === '1';
}

async function enrichHomeEvent(
  event: HomeSectionEvent,
): Promise<HomeSectionEvent> {
  const [priceInfo, remainingTickets] = await Promise.all([
    fetchEventActivePriceInfo(event.id),
    needsTicketCount(event)
      ? fetchEventRemainingTickets(event.id)
      : Promise.resolve(null),
  ]);
  return {
    ...event,
    priceInfo,
    remainingTickets,
  };
}

async function resolveSectionEvents(
  section: Record<string, unknown>,
): Promise<HomeSectionEvent[]> {
  const isFeatured = section.isFeatured === true;

  if (section.fetchUpcoming === true) {
    const useVenue = section.useVenue === true;
    const venueId =
      useVenue && section.venue != null ? String(section.venue) : undefined;
    const categoryId =
      !venueId && section.category != null
        ? String(section.category)
        : undefined;
    const res = await fetchUpcomingEvents(
      venueId
        ? { venueId }
        : categoryId
          ? { category: categoryId }
          : undefined,
    );
    const items = res.items.slice(0, 12) as HomeSectionEvent[];
    return Promise.all(items.map((event) => enrichHomeEvent(event)));
  }

  const manual = section.events;
  if (!manual || typeof manual !== 'object') return [];

  const entries = Object.keys(manual)
    .map((key) => {
      const match = /^event(\d+)$/.exec(key);
      if (!match) return null;
      const entry = (manual as Record<string, unknown>)[key];
      if (!entry || typeof entry !== 'object') return null;
      return { index: Number(match[1]), entry: entry as Record<string, unknown> };
    })
    .filter((row): row is { index: number; entry: Record<string, unknown> } => row != null)
    .sort((a, b) => a.index - b.index);

  const resolved: HomeSectionEvent[] = [];

  for (const { entry: row } of entries) {
    const eventId = typeof row.id === 'string' ? row.id : '';
    if (!eventId) continue;
    try {
      const event = await fetchEventById(eventId);
      const featuredImageUrl = pickImageSrc(row.featuredImage);
      const enriched: HomeSectionEvent = {
        ...event,
        featuredImageUrl: isFeatured ? featuredImageUrl : null,
        imageUrl:
          isFeatured && featuredImageUrl ? featuredImageUrl : event.imageUrl,
      };
      resolved.push(await enrichHomeEvent(enriched));
    } catch {
      /* skip missing events */
    }
  }

  return resolved;
}

function dedupeEvents(events: HomeSectionEvent[]): HomeSectionEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}

async function resolveSectionTitle(
  row: Record<string, unknown>,
): Promise<string> {
  if (row.useVenue === true && row.venue != null) {
    const venue = await fetchVenueById(String(row.venue));
    if (venue?.name) return venue.name;
  }
  return pickLocalizedText(row.title) || t('defaultEventsSection');
}

export async function fetchHomeSections(): Promise<HomeSection[]> {
  const rows = await fetchCollection('homeSections');

  const sections = await Promise.all(
    rows.map(async (row) => {
      const events = dedupeEvents(
        (await resolveSectionEvents(row)).filter(
          (event) => !isPastEvent(event) && !event.hideFromMobileHome,
        ),
      );
      const title = await resolveSectionTitle(row);
      const venueId =
        row.useVenue === true && row.venue != null
          ? String(row.venue)
          : null;
      return {
        id: String(row.id ?? title),
        title,
        order: Number(row.order ?? 0),
        category: row.category != null ? String(row.category) : null,
        venueId,
        events,
        seeAllCategory:
          !venueId && row.category != null ? String(row.category) : null,
        seeAllVenueId: venueId,
        isCarousel: row.isCarousel === true,
        isFeatured: row.isFeatured === true,
        marquee: row.marquee === true,
        bannerUrl: pickImageSrc(row.banner),
        carouselBgColor:
          typeof row.carouselBgColor === 'string' && row.carouselBgColor.trim()
            ? row.carouselBgColor.trim()
            : null,
      } satisfies HomeSection;
    }),
  );

  return sections
    .filter((s) => s.events.length > 0)
    .sort((a, b) => a.order - b.order);
}
