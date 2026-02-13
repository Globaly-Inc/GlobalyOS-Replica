import { useMemo } from 'react';

/**
 * Generates a deterministic, visually distinct color from a string (e.g. employee ID).
 * Returns an HSL color string suitable for collaboration cursors.
 */
const COLLABORATION_COLORS = [
  '#FF6B6B', // red
  '#4ECDC4', // teal
  '#45B7D1', // sky blue
  '#96CEB4', // sage
  '#FFEAA7', // yellow
  '#DDA0DD', // plum
  '#98D8C8', // mint
  '#F7DC6F', // gold
  '#BB8FCE', // lavender
  '#85C1E9', // light blue
  '#F0B27A', // peach
  '#82E0AA', // green
  '#F1948A', // salmon
  '#AED6F1', // powder blue
  '#D7BDE2', // lilac
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function getCollaborationColor(id: string): string {
  const index = hashString(id) % COLLABORATION_COLORS.length;
  return COLLABORATION_COLORS[index];
}

export function useCollaborationColor(employeeId: string | undefined): string {
  return useMemo(() => {
    if (!employeeId) return COLLABORATION_COLORS[0];
    return getCollaborationColor(employeeId);
  }, [employeeId]);
}
