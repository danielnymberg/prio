/**
 * Parse natural language time expressions to ISO datetime strings
 * Supports Swedish time expressions like "kl 14", "imorgon kl 10", "på fredag"
 */

const WEEKDAYS_SV: Record<string, number> = {
  'måndag': 1,
  'tisdag': 2,
  'onsdag': 3,
  'torsdag': 4,
  'fredag': 5,
  'lördag': 6,
  'söndag': 0,
};

export function parseNaturalDateTime(text: string, referenceDate: Date = new Date()): string | null {
  const normalized = text.toLowerCase().trim();
  const today = new Date(referenceDate);
  today.setSeconds(0, 0); // Reset seconds and milliseconds

  // Extract time if present (e.g., "kl 14", "14:00", "kl 14:30")
  const timeMatch = normalized.match(/kl\s*(\d{1,2}):?(\d{2})?|(\d{1,2}):(\d{2})/);
  let hours = 9; // Default to 9 AM if no time specified
  let minutes = 0;

  if (timeMatch) {
    hours = parseInt(timeMatch[1] || timeMatch[3]);
    minutes = parseInt(timeMatch[2] || timeMatch[4] || '0');
  }

  // "idag" or just time -> today
  if (normalized.includes('idag') || (timeMatch && !normalized.match(/imorgon|vecka|fredag|måndag|tisdag|onsdag|torsdag|lördag|söndag/))) {
    today.setHours(hours, minutes, 0, 0);
    return today.toISOString();
  }

  // "imorgon" -> tomorrow
  if (normalized.includes('imorgon')) {
    today.setDate(today.getDate() + 1);
    today.setHours(hours, minutes, 0, 0);
    return today.toISOString();
  }

  // "i övermorgon" -> day after tomorrow
  if (normalized.includes('övermorgon')) {
    today.setDate(today.getDate() + 2);
    today.setHours(hours, minutes, 0, 0);
    return today.toISOString();
  }

  // Weekday references (e.g., "på fredag", "fredag kl 10", "nästa måndag")
  for (const [weekday, targetDay] of Object.entries(WEEKDAYS_SV)) {
    if (normalized.includes(weekday)) {
      const currentDay = today.getDay();
      let daysUntil = targetDay - currentDay;

      // If it's the same day or already passed this week, go to next week
      if (daysUntil <= 0 || normalized.includes('nästa')) {
        daysUntil += 7;
      }

      today.setDate(today.getDate() + daysUntil);
      today.setHours(hours, minutes, 0, 0);
      return today.toISOString();
    }
  }

  // Relative time expressions
  if (normalized.includes('om') && normalized.includes('timm')) {
    const hoursMatch = normalized.match(/om\s*(\d+)\s*timm/);
    if (hoursMatch) {
      const hoursToAdd = parseInt(hoursMatch[1]);
      today.setHours(today.getHours() + hoursToAdd);
      return today.toISOString();
    }
  }

  if (normalized.includes('om') && normalized.includes('dag')) {
    const daysMatch = normalized.match(/om\s*(\d+)\s*dag/);
    if (daysMatch) {
      const daysToAdd = parseInt(daysMatch[1]);
      today.setDate(today.getDate() + daysToAdd);
      today.setHours(hours, minutes, 0, 0);
      return today.toISOString();
    }
  }

  // Week references
  if (normalized.includes('nästa vecka')) {
    today.setDate(today.getDate() + 7);
    today.setHours(hours, minutes, 0, 0);
    return today.toISOString();
  }

  return null;
}

/**
 * Extract deadline from task description
 * Returns { deadline: string | null, cleanedText: string }
 */
export function extractDeadlineFromText(text: string): { deadline: string | null; cleanedText: string } {
  const parsed = parseNaturalDateTime(text);

  if (parsed) {
    // Remove time expressions from text
    const cleanedText = text
      .replace(/kl\s*\d{1,2}:?\d{0,2}/gi, '')
      .replace(/\s*(idag|imorgon|övermorgon|nästa\s+\w+|på\s+\w+|om\s+\d+\s+(timmar|dagar|vecka))\s*/gi, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return { deadline: parsed, cleanedText };
  }

  return { deadline: null, cleanedText: text };
}
