import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GtText } from '../components/gt';
import { useAppTheme } from '../theme/useAppTheme';
import { AD_UNITS, adsSupported, initAds } from './ads';
import { getAdsSdk } from './adsSdk';
import { useEntitlements } from './entitlements';

/**
 * The lite edition's banner: an anchored adaptive banner under the page header of Analytics
 * and Settings, with a one-line "Remove ads" link under it that opens the paywall. Renders
 * nothing in the full edition, on web, for "No ads" owners, and until consent is gathered.
 */
export function AdBanner({ testID = 'ad-banner' }: { testID?: string }) {
  const { lite, entitlements } = useEntitlements();
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const show = lite && !entitlements.noAds && adsSupported;

  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    initAds().then(s => {
      if (!cancelled) setReady(s.ready);
    });
    return () => {
      cancelled = true;
    };
  }, [show]);

  const ads = getAdsSdk();
  if (!show || !ready || !ads) return null;
  const { BannerAd, BannerAdSize } = ads;
  return (
    <View testID={testID} style={styles.wrap}>
      <BannerAd unitId={AD_UNITS.banner} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} onAdLoaded={() => setLoaded(true)} onAdFailedToLoad={() => setLoaded(false)} />
      {loaded && <RemoveAdsLink />}
    </View>
  );
}

function RemoveAdsLink() {
  const { gt } = useAppTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  return (
    <GtText
      variant="caption"
      color={gt.textMuted}
      style={styles.link}
      onPress={() => navigation.navigate('Upgrade', { reason: 'ads' })}
      accessibilityRole="link"
      testID="remove-ads-link"
    >
      {t('upgrade.removeAdsLink')}
    </GtText>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 4, marginBottom: 8 },
  link: { textDecorationLine: 'underline' },
});
