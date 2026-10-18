import { getTrackingPermissionsAsync, requestTrackingPermissionsAsync } from 'expo-tracking-transparency';

/**
 * Shows the App Tracking Transparency prompt if the user has not answered it yet. The UMP flow is
 * meant to show it (after Google's IDFA explainer), but it does not when the consent request fails
 * or no explainer message is served — and an app that declares NSUserTrackingUsageDescription must
 * actually ask (App Review 5.1.2). Never throws; the ads SDK reads the answer itself.
 */
export async function ensureTrackingPrompt(): Promise<void> {
  try {
    const current = await getTrackingPermissionsAsync();
    if (current.status === 'undetermined' && current.canAskAgain) await requestTrackingPermissionsAsync();
  } catch (error) {
    console.warn('Tracking prompt not shown:', error);
  }
}
