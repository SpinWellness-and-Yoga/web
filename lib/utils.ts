export function capitalizeWords(text: string): string {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function formatEventDescription(description: string): string[] {
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
  
  return paragraphs.length > 0 ? paragraphs : [text];
}

export function getEventVenue(location: string): string {
  const locationLower = location.toLowerCase();
  if (locationLower.includes('lagos')) {
    return 'Alpha Fitness Studio, Lagos';
  } else if (locationLower.includes('ibadan')) {
    return 'TYAwithNio Studios, Ibadan';
  }
  return '';
}

export function getEventAddress(location: string): string {
  const locationLower = location.toLowerCase();
  if (locationLower.includes('lagos')) {
    return 'Alpha Fitness Studios, Centro Lekki Mall, Plot 65a Admiralty Way, Lekki Phase 1 Lagos, Nigeria';
  } else if (locationLower.includes('ibadan')) {
    return '16 Ilaro St, Old Bodija, Ibadan 200212, Oyo, Nigeria';
  }
  return '';
}

export function getMapsUrl(address: string): string {
  const encodedAddress = encodeURIComponent(address);
  return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
}

export function normalizeEventCopy(text: string): string {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/\.\s+/g, '. ')
    .trim();
}