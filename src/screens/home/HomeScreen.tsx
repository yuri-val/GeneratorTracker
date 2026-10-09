import React, { useMemo, useState } from 'react';
import { View, StyleSheet, RefreshControl, Pressable } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { SyncStatusIndicator } from '../../components/SyncStatusIndicator';
import { ScreenHeader } from '../../components/ScreenHeader';
import { AppIcon } from '../../components/AppIcon';
import { GtText, TAB_BAR_OFFSET, useSnackbarBottomOffset } from '../../components/gt';
import { IdleRow, RunningCard } from '../../components/fleet/FleetRows';
import { useAppTheme } from '../../theme/useAppTheme';
import { isIOS } from '../../theme/platform';
import { useTabBarOverlap } from '../../navigation/useTabBarOverlap';
import { contentColumn } from '../../theme/layout';
import { space } from '../../theme/tokens';
import { buildFleet, useFleet, type FleetItem } from '../../hooks/useFleet';
import { useNow } from '../../hooks/useNow';
import { useSessionActions } from '../../hooks/useSessionActions';
import { fmtSummary } from '../../utils/format';

/**
 * Home (3.0, design 5a / 5d): running generators on top as inverted cards with a Stop button,
 * idle ones below as rows with Start. Times refresh once a minute.
 */
export default function HomeScreen() {
  const theme = useAppTheme();
  const { gt } = theme;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarOverlap = useTabBarOverlap();
  const { raw, reload } = useFleet();
  const [refreshing, setRefreshing] = useState(false);
  const anyRunning = !!raw?.s.some(s => s.isActive);
  const now = useNow(60_000, anyRunning);
  const { start, stop } = useSessionActions(reload);
  useSnackbarBottomOffset(TAB_BAR_OFFSET);

  const fleet = useMemo(() => (raw ? buildFleet(raw.g, raw.s, raw.r, raw.t, now) : []), [raw, now]);
  const runningCount = fleet.filter(i => i.running).length;

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const addGenerator = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('AddGenerator', {});
  };

  const open = (item: FleetItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('GeneratorDetail', { generatorId: item.generator.id });
  };

  const renderItem = ({ item }: { item: FleetItem }) => {
    const props = {
      item,
      now,
      onOpen: () => open(item),
      onStart: () => start(item.generator.id),
      onStop: () => item.running && stop(item.running, item.generator.name),
    };
    return item.running ? <RunningCard {...props} /> : <IdleRow {...props} />;
  };

  const summary = fleet.length > 0 ? fmtSummary(fleet.length, runningCount, i18n.language) : t('home.summaryEmpty');

  // iOS: the native large title "Генератори" and "+" live in the navigation bar; the summary line and
  // the 1.5 px ink rule open the list. Android/web: the whole header is drawn here (no FAB in 3.0).
  const listHeader = isIOS ? (
    <View style={styles.iosHeader}>
      <GtText variant="meta" color={gt.textMuted} testID="home-summary">
        {summary}
      </GtText>
      <View style={[styles.rule, { backgroundColor: gt.ruleStrong }]} />
    </View>
  ) : (
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <GtText variant="meta" color={gt.textMuted} testID="home-summary">
            {summary}
          </GtText>
          <GtText variant="largeTitle" accessibilityRole="header">
            {t('home.title')}
          </GtText>
        </View>
        <SyncStatusIndicator />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('generator.addTitle')}
          testID="fab-add-generator"
          onPress={addGenerator}
          style={({ pressed }) => [
            styles.addButton,
            gt.dark ? { backgroundColor: pressed ? gt.raised : '#1A1918' } : { borderColor: gt.text, borderWidth: 1.5 },
            !gt.dark && pressed && { backgroundColor: gt.pressed },
          ]}
        >
          <AppIcon name="add" size={22} color={gt.text} />
        </Pressable>
      </View>
      <View style={[styles.rule, { backgroundColor: gt.ruleStrong }]} />
    </View>
  );

  const list = (
    <Animated.FlatList
      data={fleet}
      renderItem={renderItem}
      keyExtractor={item => item.generator.id}
      itemLayoutAnimation={LinearTransition.duration(250)}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: gt.bg }}
      ListHeaderComponent={listHeader}
      ItemSeparatorComponent={Separator}
      contentContainerStyle={[styles.listContent, contentColumn, { paddingBottom: tabBarOverlap + 24 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={gt.textMuted} />}
      ListEmptyComponent={
        raw ? (
          <View style={styles.empty}>
            <AppIcon name="engineOff" size={64} color={gt.textMuted} />
            <GtText variant="cardTitle" color={gt.text} style={styles.center}>
              {t('home.noGenerators')}
            </GtText>
            <GtText variant="body" color={gt.textMuted} style={styles.center}>
              {t(isIOS ? 'home.addFirstGeneratorIOS' : 'home.addFirstGenerator')}
            </GtText>
          </View>
        ) : null
      }
    />
  );

  if (isIOS) {
    return (
      <>
        <ScreenHeader
          title={t('home.title')}
          largeTitle
          scrollEdge
          trailing={<SyncStatusIndicator />}
          actions={[
            {
              key: 'add',
              label: t('generator.addTitle'),
              icon: 'add',
              variant: 'prominent',
              onPress: addGenerator,
              testID: 'fab-add-generator',
            },
          ]}
        />
        {list}
      </>
    );
  }

  return <View style={[styles.flex, { backgroundColor: gt.bg }]}>{list}</View>;
}

function Separator() {
  return <View style={{ height: space.s }} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  listContent: { paddingHorizontal: space.screenX },
  iosHeader: { paddingTop: 4, gap: 10, marginBottom: space.s },
  header: { gap: 14, marginBottom: space.s },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  addButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  rule: { height: 1.5 },
  empty: { alignItems: 'center', paddingTop: 72, paddingHorizontal: 32, gap: 12 },
});
