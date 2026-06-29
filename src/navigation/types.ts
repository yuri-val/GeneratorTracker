export type RootStackParamList = {
  MainTabs: undefined;
  GeneratorDetail: { generatorId: string };
  AddGenerator: { generatorId?: string };
  AddWorkSession: { generatorId: string; sessionId?: string };
  AddRefill: { generatorId: string; refillId?: string };
  AddMaintenance: { generatorId: string; taskId?: string };
};

export type TabParamList = {
  Home: undefined;
  Analytics: undefined;
  Settings: undefined;
};
