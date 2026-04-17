/**
 * Shared theme — Telegram-inspired palette.
 */

export const colors = {
  primary: '#2AABEE',
  primaryDark: '#1E96D4',
  accent: '#54A9EB',

  background: '#FFFFFF',
  surface: '#F4F4F5',
  divider: '#E7E8EA',

  textPrimary: '#000000',
  textSecondary: '#707579',
  textTertiary: '#A2ACB4',
  textOnPrimary: '#FFFFFF',

  bubbleOwn: '#EFFDDE',
  bubbleOther: '#FFFFFF',
  bubbleShadow: 'rgba(0,0,0,0.08)',

  badge: '#2AABEE',
  danger: '#E53935',
};

// Avatar colors — picked by hash of the chat/user id.
export const avatarPalette = [
  '#FF885E',
  '#FFCD6A',
  '#8EEE98',
  '#72D5FD',
  '#E0A2F3',
  '#FFA8A8',
  '#B794F4',
  '#62D4BB',
];

export function avatarColor(seed: string | number | undefined | null): string {
  if (seed == null) return avatarPalette[0];
  const s = String(seed);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return avatarPalette[h % avatarPalette.length];
}

export function initialsOf(title: string | undefined | null): string {
  if (!title) return '?';
  const parts = title.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + second).toUpperCase() || '?';
}

export function formatTime(unixSec: number | undefined): string {
  if (!unixSec) return '';
  const date = new Date(unixSec * 1000);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) {
    return date
      .toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
      .replace(/\s?[AP]M$/i, '');
  }
  const oneDay = 24 * 60 * 60 * 1000;
  if (now.getTime() - date.getTime() < 7 * oneDay) {
    return date.toLocaleDateString([], {weekday: 'short'});
  }
  return date.toLocaleDateString([], {month: 'short', day: 'numeric'});
}
