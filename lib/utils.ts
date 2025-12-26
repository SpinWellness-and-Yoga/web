export function capitalizeWords(text: string): string {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function normalizeEventCopy(text: string): string {
  const input = (text ?? '').toString();
  if (!input) return '';

  return input
    .replace(/\b2[-\s]?hour\s+session\b/gi, '90-minute session');
}

type EventDescriptionBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'itinerary'; title: string; items: Array<{ duration: string; text: string }> };

function parseClockTimeToMinutes(hh: string, mm: string, meridiem?: 'am' | 'pm'): number | null {
  const h = Number.parseInt(hh, 10);
  const m = Number.parseInt(mm, 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 12 || m < 0 || m > 59) return null;

  let hours = h;
  if (meridiem) {
    const isPm = meridiem === 'pm';
    if (hours === 12) hours = isPm ? 12 : 0;
    else if (isPm) hours += 12;
  }

  return hours * 60 + m;
}

function inferDurationFromTimeRange(timeRange: string): string | null {
  const m = timeRange
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (!m) return null;

  const endMeridiem = (m[5] as 'am' | 'pm' | undefined) ?? undefined;
  const startMinutes = parseClockTimeToMinutes(m[1], m[2], endMeridiem);
  const endMinutes = parseClockTimeToMinutes(m[3], m[4], endMeridiem);
  if (startMinutes === null || endMinutes === null) return null;

  let diff = endMinutes - startMinutes;
  if (diff < 0) diff += 24 * 60;
  if (diff <= 0 || diff > 6 * 60) return null;

  return `${diff}-minute`;
}

function parseEventFlowItinerary(text: string): Array<{ duration: string; text: string }> {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const items: Array<{ duration: string; text: string }> = [];
  const parts = normalized.split(/\.\s+/).map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    const match = part.match(
      /^(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\s*(?:am|pm)?)\s*-\s*(.+)$/i
    );
    if (!match) continue;

    const timeRange = match[1];
    let rest = match[2].trim();

    // remove trailing period if present
    rest = rest.replace(/\.$/, '').trim();

    const explicit = rest.match(/^(\d+)\s*-\s*minute\s+(.+)$/i) ?? rest.match(/^(\d+)\s*minute\s+(.+)$/i);
    if (explicit) {
      const minutes = Number.parseInt(explicit[1], 10);
      const duration = Number.isFinite(minutes) ? `${minutes}-minute` : 'duration';
      const itemText = normalizeEventCopy(explicit[2].trim());
      if (!/clean[-\s]?up\s+and\s+exit/i.test(itemText)) {
        items.push({ duration, text: itemText });
      }
      continue;
    }

    const inferred = inferDurationFromTimeRange(timeRange);
    const normalizedRest = normalizeEventCopy(rest);
    if (!/clean[-\s]?up\s+and\s+exit/i.test(normalizedRest)) {
      items.push({ duration: inferred ?? 'duration', text: normalizedRest });
    }
  }

  return items;
}

export function formatEventDescription(description: string): EventDescriptionBlock[] {
  if (!description || typeof description !== 'string') {
    return [];
  }
  
  const text = description.trim();
  if (!text) {
    return [];
  }
  
  const paragraphs: string[] = [];
  
  const splitPatterns = [
    /\.\s+(Event Flow:)/i,
    /\.\s+(Limited To)/i,
    /\.\s+(Perfect For)/i,
    /\.\s+(This Event Provides)/i,
  ];
  
  let remainingText = text;
  let lastSplitIndex = 0;
  
  for (const pattern of splitPatterns) {
    const match = remainingText.substring(lastSplitIndex).match(pattern);
    if (match && match.index !== undefined) {
      const splitIndex = lastSplitIndex + match.index;
      
      if (splitIndex > lastSplitIndex) {
        const paragraph = remainingText.substring(0, splitIndex + match[0].indexOf(match[1])).trim();
        if (paragraph) {
          paragraphs.push(paragraph);
        }
        remainingText = remainingText.substring(splitIndex + match[0].indexOf(match[1]));
        lastSplitIndex = 0;
      }
    }
  }
  
  if (remainingText.trim()) {
    paragraphs.push(remainingText.trim());
  }
  
  const blocks: EventDescriptionBlock[] = [];
  const source = paragraphs.length > 0 ? paragraphs : [text];

  for (const paragraph of source) {
    const eventFlowMatch = paragraph.match(/^\s*event flow:\s*(.+)$/i);
    if (eventFlowMatch) {
      const items = parseEventFlowItinerary(eventFlowMatch[1]);
      if (items.length > 0) {
        blocks.push({ type: 'itinerary', title: 'event flow', items });
        continue;
      }
    }

    blocks.push({ type: 'paragraph', text: normalizeEventCopy(paragraph) });
  }

  return blocks;
}

export function getEventAddress(location: string): string {
  const locationLower = (location ?? '').trim().toLowerCase();
  
  if (locationLower.includes('lagos')) {
    return 'Centro Lekki Mall, 15 Admiralty Wy, Lekki Phase 1, Lagos, Nigeria';
  }
  
  if (locationLower.includes('ibadan')) {
    return '16 Ilaro St, Old Bodija, Ibadan 200212, Oyo, Nigeria';
  }
  
  // default to ibadan if location is unclear
  return '16 Ilaro St, Old Bodija, Ibadan 200212, Oyo, Nigeria';
}

export function getMapsUrl(address: string): string {
  const encodedAddress = encodeURIComponent(address);
  return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
}

export function getEventLocationLabel(location: string): string {
  const locationLower = (location ?? '').trim().toLowerCase();
  if (locationLower.includes('ibadan')) return 'TYAwithNio Studios, Ibadan';
  if (locationLower.includes('lagos')) return 'Alpha Fitness Studios, Lagos';
  return capitalizeWords((location ?? '').trim());
}

export function generateEventSlug(eventName: string, location: string): string {
  const nameLower = (eventName ?? '').trim().toLowerCase();
  const locationLower = (location ?? '').trim().toLowerCase();
  
  let locationPart = '';
  if (locationLower.includes('lagos')) {
    locationPart = 'lagos';
  } else if (locationLower.includes('ibadan')) {
    locationPart = 'ibadan';
  }
  
  let nameSlug = nameLower
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  nameSlug = nameSlug.replace(/-edition$/g, '');
  
  if (!locationPart) {
    return nameSlug;
  }
  
  const nameHasLocation = nameSlug.includes(`-${locationPart}`) || nameSlug.endsWith(locationPart);
  return nameHasLocation ? nameSlug : `${nameSlug}-${locationPart}`;
}

