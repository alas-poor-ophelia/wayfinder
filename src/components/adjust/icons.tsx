/**
 * Stroke-style icons for the Adjustments tab (campaign-day header, section
 * headers, tray, controls). The plugin's shared <Icon> (src/components/common)
 * is fill-based / single-path from the RPG-Awesome registry; these decorative
 * 24px stroke glyphs are tab-local and ported verbatim from the redesign
 * handoff (stroke-width 1.7, round caps).
 */

const STROKE_ICONS: Record<string, string> = {
  moon: '<path d="M20 14.5A8 8 0 119.5 4 6.3 6.3 0 0020 14.5z"/>',
  bolt: '<path d="M13 2L4.5 13.5H11l-1 8.5 8.5-12H12l1-8z"/>',
  skull:
    '<path d="M5 11.5C5 7 8 4 12 4s7 3 7 7.5c0 2.2-1 3.6-2 4.4v2.3a1.3 1.3 0 01-1.3 1.3H8.3A1.3 1.3 0 017 18.2V16c-1-.8-2-2.2-2-4.5z"/><circle cx="9.3" cy="11.5" r="1.3"/><circle cx="14.7" cy="11.5" r="1.3"/>',
  sparkles:
    '<path d="M12 3l1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4z"/><path d="M18.5 14l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z"/>',
  sliders:
    '<path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="15" cy="8" r="2.3"/><circle cx="9" cy="16" r="2.3"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  leaf: '<path d="M5 19c0-9 6-14 14-14 0 9-5 14-14 14z"/><path d="M5 19c3-5 6-7 10-9"/>',
};

export function AdjIcon({ name, size = 18 }: { name: string; size?: number }) {
  const inner = STROKE_ICONS[name] ?? STROKE_ICONS.bolt;
  return (
    <svg
      class="ms-adjust__ic-svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
