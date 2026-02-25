export type RootStackParamList = {
  Tabs: undefined;
  GroupDetail: { groupId: number };
  WordDetail: { wordId: string };
  WordPlayer: { groupId: number; startWordId?: string };
  Settings: undefined;
};

export type TabsParamList = {
  Home: undefined;
  Review: undefined;
  Test: undefined;
  Groups: undefined;
  Todo: undefined;
  Rewards: undefined;
};

export type TestStackParamList = {
  TestSetup: undefined;
  TakeTest: undefined;
  TestResult: undefined;
  PracticeChapters: undefined;
  PracticeSetup: { chapterId: string };
  PracticeTake: undefined;
  PracticeResult: undefined;
  PracticeTimer: { title?: string; initialDurationSec?: number };
};
