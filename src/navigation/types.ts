export type RootStackParamList = {
  Tabs: undefined;
  GroupDetail: { groupId: number };
  WordDetail: { wordId: string };
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
};
