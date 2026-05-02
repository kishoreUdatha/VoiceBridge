/**
 * Get display name - if firstName contains lastName, show only firstName
 * Otherwise combine firstName + lastName
 */
export const getDisplayName = (firstName?: string | null, lastName?: string | null): string => {
  const first = (firstName || '').trim();
  const last = (lastName || '').trim();

  if (!first) return last || '';
  if (!last) return first;

  // If firstName already contains lastName, return firstName only
  if (first.toLowerCase().includes(last.toLowerCase())) {
    return first;
  }

  return `${first} ${last}`;
};

/**
 * Get initials from firstName and lastName with smart logic
 */
export const getNameInitials = (firstName?: string | null, lastName?: string | null): string => {
  const first = (firstName || '').trim();
  const last = (lastName || '').trim();

  if (!first && !last) return '?';

  // If no lastName or firstName contains lastName, use initials from firstName parts
  if (!last || first.toLowerCase().includes(last.toLowerCase())) {
    const nameParts = first.split(' ').filter(Boolean);
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  }

  // Otherwise use first initial from firstName and lastName
  return ((first[0] || '') + (last[0] || '')).toUpperCase();
};
