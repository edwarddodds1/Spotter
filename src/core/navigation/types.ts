export type RootStackParamList = {
  Tabs: undefined;
  BreedSelector: undefined;
  DogNaming: undefined;
  BreedDetail: { breedId: string };
  AdminBreedEditor: { breedId: string };
  PendingScanDetail: { scanId: string };
  EditScan: { scanId: string };
  LeagueDetail: { leagueId: string; leagueName: string; memberCount: number; maxMembers: number };
  Friends: undefined;
  DogProfile: { dogProfileId: string };
  TopDogs: undefined;
  Settings: undefined;
  Privacy: undefined;
  Terms: undefined;
};

export type TabParamList = {
  DogdexTab: undefined;
  SocialTab: undefined;
  SpotTab: undefined;
  LeaguesTab: undefined;
  ProfileTab: undefined;
};
