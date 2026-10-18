// App Tracking Transparency exists on iOS only (tracking.ios.ts); Android and web have nothing to ask.
// expo-tracking-transparency is excluded from Android autolinking (package.json): its Android part adds
// the AD_ID permission, which the paid app must not declare.
export async function ensureTrackingPrompt(): Promise<void> {}
