import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
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

/**
 * The live bar on the Analytics / Settings tabs: inside the iOS 26 tab bar accessory, or as a footer
 * above the tab bar elsewhere. Never on Home, where the cards already show the state.
 */
export function TabLiveBar({ placement }: { placement: 'footer' | 'accessory' }) {
  const navigation = useNavigation<any>();
  const { running, now, reload } = useRunningFleet();
  const { stop } = useSessionActions(reload);
  if (running.length === 0) return null;
  const bar = (
    <LiveBar
      others={running}
      now={now}
      placement={placement}
      onStop={item => item.running && stop(item.running, item.generator.name)}
      onHome={() => navigation.navigate('MainTabs', { screen: 'Home' })}
    />
  );
  return placement === 'footer' ? <View style={{ paddingVertical: 8 }}>{bar}</View> : bar;
}
