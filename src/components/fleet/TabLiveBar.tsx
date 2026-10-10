import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { Generator, MaintenanceTask, Refill, WorkSession } from '../../models/types';
import { getGenerators, getMaintenanceTasks, getRefills, getWorkSessions } from '../../utils/storage';
import { buildFleet } from '../../hooks/useFleet';
import { useNow } from '../../hooks/useNow';
import { useSessionActions } from '../../hooks/useSessionActions';
import { onSessionsChanged } from '../../services/sessions';
import { LiveBar } from './LiveBar';

type Raw = { g: Generator[]; s: WorkSession[]; r: Refill[]; t: MaintenanceTask[] };

/** Running generators, kept fresh on start/stop/undo anywhere in the app. */
export function useRunningFleet() {
  const [raw, setRaw] = useState<Raw | null>(null);
  const reload = useCallback(async () => {
    const [g, s, r, t] = await Promise.all([getGenerators(), getWorkSessions(), getRefills(), getMaintenanceTasks()]);
    setRaw({ g, s, r, t });
  }, []);
  useEffect(() => {
    reload();
    return onSessionsChanged(() => {
      reload();
    });
  }, [reload]);
  const anyRunning = !!raw?.s.some(s => s.isActive);
  const now = useNow(60_000, anyRunning);
  const running = useMemo(() => (raw ? buildFleet(raw.g, raw.s, raw.r, raw.t, now).filter(i => i.running) : []), [raw, now]);
  return { running, now, reload };
}

/** The live bar on the Analytics / Settings tabs, as a footer above the tab bar. Never on Home. */
export function TabLiveBar() {
  const navigation = useNavigation<any>();
  const { running, now, reload } = useRunningFleet();
  const { stop } = useSessionActions(reload);
  // The iOS tab bar is translucent and drawn over the screen; keep the bar above it.
  const tabBarHeight = useBottomTabBarHeight();
  if (running.length === 0) return null;
  const bar = (
    <LiveBar
      others={running}
      now={now}
      onStop={item => item.running && stop(item.running, item.generator.name)}
      onHome={() => navigation.navigate('MainTabs', { screen: 'Home' })}
    />
  );
  return <View style={{ paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? tabBarHeight + 8 : 8 }}>{bar}</View>;
}
