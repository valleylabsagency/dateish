import { StackNavigationProp } from "@react-navigation/stack";

export type RootStackParamList = {
  Welcome: undefined;
  Bar: undefined;
};

export type NavigationProp = StackNavigationProp<RootStackParamList>;
