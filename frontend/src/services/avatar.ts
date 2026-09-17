import menAvatar from '../assets/avatars/men.png';
import womenAvatar from '../assets/avatars/women.png';

export const MEN_AVATAR = menAvatar;
export const WOMEN_AVATAR = womenAvatar;

/**
 * Returns the default icon according to gender ('Male' | 'Female' | 'men' | 'women')
 */
export const getAvatarByGender = (gender?: string): string => {
  if (!gender) return MEN_AVATAR;
  const g = gender.toLowerCase().trim();
  if (g.startsWith('f') || g.includes('wom')) {
    return WOMEN_AVATAR;
  }
  return MEN_AVATAR;
};

/**
 * Known female names heuristic fallback when gender is not explicitly saved
 */
const FEMALE_NAMES = new Set([
  'ananya', 'priya', 'pooja', 'sneha', 'kavya', 'divya', 'sarah', 'emily',
  'neha', 'shreya', 'swati', 'deepa', 'meera', 'aarti', 'jyoti', 'rekha',
  'sunita', 'radha', 'lakshmi', 'anita', 'geeta', 'rita', 'mona', 'sonia',
  'woman', 'women', 'female', 'girl', 'lady'
]);

/**
 * Returns either the Men or Women avatar icon based on gender or name.
 */
export const getAvatarByName = (name?: string, gender?: string): string => {
  if (gender) {
    return getAvatarByGender(gender);
  }

  if (!name) return MEN_AVATAR;

  const lower = name.toLowerCase().trim();

  // Check if any word or name segment matches female names
  const tokens = lower.split(/[\s._-]+/);
  for (const token of tokens) {
    if (FEMALE_NAMES.has(token)) {
      return WOMEN_AVATAR;
    }
  }

  return MEN_AVATAR;
};

/**
 * Resolves a profile photo URL. If the photo is undefined, empty, or an old Unsplash stock photo,
 * it returns the clean Men or Women icon based on gender/name.
 */
export const resolveAvatar = (
  photo?: string | null,
  name?: string,
  gender?: string
): string => {
  if (
    photo &&
    photo.trim() !== '' &&
    !photo.includes('images.unsplash.com') &&
    !photo.includes('photo-15') &&
    !photo.includes('photo-14') &&
    !photo.includes('photo-16')
  ) {
    return photo;
  }

  return getAvatarByName(name, gender);
};

