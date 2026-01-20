import { Generator } from '../models/types';

export type RootStackParamList = {
  MainTabs: undefined;
  GeneratorDetail: { generatorId: string };
  AddGenerator: { generator?: Generator };
  AddWorkSession: { generatorId: string; sessionId?: string };
  AddRefill: { generatorId: string };
};

export type TabParamList = {
  Home: undefined;
  Analytics: undefined;
  Settings: undefined;
};
