import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import type { RootStackParamList } from '../../navigation/types';
import { ScreenHeader } from '../../components/ScreenHeader';
import { GtText, SquareButton, useSnackbar } from '../../components/gt';
import { useAppTheme } from '../../theme/useAppTheme';
import { contentColumn } from '../../theme/layout';
import { space } from '../../theme/tokens';
import { LIMITS, PRODUCT_IDS, useEntitlements, type ProductId } from '../../monetization';

const PRIVACY_URL = 'https://generatortracker.yuri-val.dev/privacy_policy/privacy-policy.html';

/**
 * The paywall of the lite edition (3.0 style): three non-consumables as square cards with the
 * store price on the button, "Restore purchases" below. Opened from a limit, the "Remove ads"
 * link under a banner, or Settings → Purchases.
 */
export default function UpgradeScreen() {
  const { gt } = useAppTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Upgrade'>>();
  const { entitlements, products, owned, storeAvailable, busy, purchase, restore } = useEntitlements();
  const snackbar = useSnackbar();
  const [pending, setPending] = useState<ProductId | null>(null);

  const reasonText =
    params?.reason === 'generators'
      ? t('upgrade.reasonGenerators', { count: LIMITS.generators })
      : params?.reason === 'maintenance'
        ? t('upgrade.reasonMaintenance', { count: LIMITS.maintenanceTasksPerGenerator })
        : params?.reason === 'ads'
          ? t('upgrade.reasonAds')
          : t('upgrade.intro', { generators: LIMITS.generators, tasks: LIMITS.maintenanceTasksPerGenerator });

  const buy = async (id: ProductId) => {
    setPending(id);
    try {
      const ok = await purchase(id);
      if (ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        snackbar.show({ message: t('upgrade.purchased'), testID: 'snackbar-purchased' });
        navigation.goBack();
      }
    } catch (error) {
      console.warn('Purchase failed:', error);
      Alert.alert(t('common.error'), t('upgrade.purchaseError'));
    } finally {
      setPending(null);
    }
  };

  const onRestore = async () => {
    try {
      const count = await restore();
      snackbar.show({ message: count > 0 ? t('upgrade.restored') : t('upgrade.nothingToRestore'), testID: 'snackbar-restored' });
    } catch (error) {
      console.warn('Restore failed:', error);
      Alert.alert(t('common.error'), t('upgrade.purchaseError'));
    }
  };

  const everythingOwned = entitlements.noAds && entitlements.unlimited;
  const cards: { id: ProductId; title: string; body: string; ownedNow: boolean }[] = [
    {
      id: PRODUCT_IDS.everything,
      title: t('upgrade.everythingTitle'),
      body: t('upgrade.everythingBody'),
      ownedNow: owned.includes(PRODUCT_IDS.everything) || everythingOwned,
    },
    { id: PRODUCT_IDS.removeAds, title: t('upgrade.removeAdsTitle'), body: t('upgrade.removeAdsBody'), ownedNow: entitlements.noAds },
    {
      id: PRODUCT_IDS.unlimited,
      title: t('upgrade.unlimitedTitle'),
      body: t('upgrade.unlimitedBody', { generators: LIMITS.generators, tasks: LIMITS.maintenanceTasksPerGenerator }),
      ownedNow: entitlements.unlimited,
    },
  ];
  const priceOf = (id: ProductId) => products.find(p => p.id === id)?.price;

  return (
    <View style={[styles.flex, { backgroundColor: gt.dark ? gt.surface : gt.bg }]}>
      <ScreenHeader title={t('upgrade.title')} leading="close" onLeadingPress={() => navigation.goBack()} leadingTestID="upgrade-close" />
      <ScrollView style={styles.flex} contentContainerStyle={[styles.content, contentColumn]}>
        <GtText variant="body" color={gt.textMuted} testID="upgrade-reason">
          {reasonText}
        </GtText>

        {cards.map(card => {
          const price = priceOf(card.id);
          const featured = card.id === PRODUCT_IDS.everything;
          return (
            <View
              key={card.id}
              testID={`product-${card.id}`}
              style={[styles.card, { borderColor: featured ? gt.text : gt.dark ? gt.ruleStrong : gt.rule, borderWidth: featured ? 1.5 : 1 }]}
            >
              <View style={styles.cardText}>
                <GtText variant="cardTitle">{card.title}</GtText>
                <GtText variant="meta" color={gt.textMuted}>
                  {card.body}
                </GtText>
              </View>
              {card.ownedNow ? (
                <GtText variant="rowTitle" color={gt.textMuted} testID={`owned-${card.id}`}>
                  ✓ {t('upgrade.owned')}
                </GtText>
              ) : (
                <SquareButton
                  kind={featured ? 'primary' : 'outline'}
                  label={price ?? t('upgrade.buy')}
                  onPress={() => buy(card.id)}
                  disabled={busy || !storeAvailable || !price}
                  height={48}
                  testID={`buy-${card.id}`}
                  accessibilityLabel={`${t('upgrade.buy')} ${card.title}${price ? `, ${price}` : ''}`}
                />
              )}
            </View>
          );
        })}

        {!storeAvailable && (
          <GtText variant="meta" color={gt.textMuted} testID="store-unavailable">
            {t('upgrade.storeUnavailable')}
          </GtText>
        )}

        <SquareButton kind="secondary" label={t('upgrade.restore')} onPress={onRestore} disabled={busy || !storeAvailable} height={48} testID="restore-purchases" />
        {pending && (
          <GtText variant="caption" color={gt.textMuted}>
            {t('upgrade.processing')}
          </GtText>
        )}

        <GtText variant="caption" color={gt.textMuted}>
          {t('upgrade.footnote')}{' '}
          <GtText variant="caption" color={gt.text} style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link">
            {t('upgrade.privacyLink')}
          </GtText>
        </GtText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: space.screenX, paddingTop: 18, paddingBottom: 32, gap: space.xl },
  card: { padding: 16, gap: 14 },
  cardText: { gap: 4 },
  link: { textDecorationLine: 'underline' },
});
