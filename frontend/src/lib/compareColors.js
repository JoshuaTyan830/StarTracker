export const COMPARE_COLORS = [
  '#2563eb',
  '#dc2626',
  '#059669',
  '#d97706',
  '#7c3aed',
];

export function compareColor(index) {
  return COMPARE_COLORS[index % COMPARE_COLORS.length];
}
