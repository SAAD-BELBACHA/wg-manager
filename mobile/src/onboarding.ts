import AsyncStorage from '@react-native-async-storage/async-storage';

// Bump the version suffix to re-show the intro to everyone after a redesign.
export const ONBOARDING_SEEN_KEY = 'zofri.onboarding.seen.v1';

export async function markOnboardingSeen() {
  try { await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1'); } catch {}
}

export async function hasSeenOnboarding(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(ONBOARDING_SEEN_KEY)) === '1'; }
  catch { return true; }
}
