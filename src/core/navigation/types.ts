export type RootStackParamList = {
  Tabs: undefined;
  BreedSelector: undefined;
  DogNaming: undefined;
  BreedDetail: { breedId: string };
  PendingScanDetail: { scanId: string };
  Friends: undefined;
  DogProfile: { dogProfileId: string };
  TopDogs: undefined;
};

export type TabParamList = {
  DogdexTab: undefined;
  SocialTab: undefined;
  SpotTab: undefined;
  LeaguesTab: undefined;
  ProfileTab: undefined;
};
