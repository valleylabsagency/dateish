import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Text } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

const tabs = [
  { label: 'Bar', icon: require('../assets/images/icons/bar-tab-icon.png'), route: '/bar' },
  { label: 'Browse', icon: require('../assets/images/icons/browse-tab-icon.png'), route: '/browse' },
  { label: 'Chats', icon: require('../assets/images/icons/chats-icon.png'), route: '/chats' },
  { label: 'Stage', icon: require('../assets/images/icons/stage-tab-icon.png'), route: '/stage' },
];

// Mapping for the selected (pink) icons.
const pinkIcons = {
  Bar: require('../assets/images/icons/bar-pink.png'),
  Browse: require('../assets/images/icons/browse-pink.png'),
  Chats: require('../assets/images/icons/chat-pink.png'),
  Stage: require('../assets/images/icons/stage-pink.png'),
};

export default function BottomNavbar({ selectedTab }: { selectedTab: string }) {
  const router = useRouter();
  const currentPath = usePathname();

  const handleTabPress = (route: string) => {
    if (route !== currentPath) {
      router.push(route);
    }
  };

  return (
    <View style={styles.navbar}>
      {tabs.map((tab) => {
        let labelAdditionalStyle = {};
        let iconAdditionalStyle = {};
        let tabAdditionalStyle = {};
        if (tab.label === "Browse") {
          labelAdditionalStyle = styles.browseLabel;
          iconAdditionalStyle = styles.browseIcon;
          // Override top padding for Browse by specifying it last
          tabAdditionalStyle = { height: 90, position: "relative", top: 0};
        } else if (tab.label === "Stage") {
          labelAdditionalStyle = styles.stageLabel;
          iconAdditionalStyle = styles.stageIcon;
          // Override top padding for Stage
          tabAdditionalStyle = { paddingTop: 9 };
        }
        const isSelected = tab.label === selectedTab;
        return (
          <TouchableOpacity
            key={tab.label}
            style={[styles.tab, tabAdditionalStyle, isSelected && styles.selectedTab]}
            onPress={() => handleTabPress(tab.route)}
          >
            <Image
              source={isSelected ? pinkIcons[tab.label] : tab.icon}
              style={[styles.icon, iconAdditionalStyle, isSelected && styles.selectedIcon]}
              resizeMode="contain"
            />
            <Text
              style={[styles.label, labelAdditionalStyle, isSelected && styles.selectedLabel]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    width: '100%',
    height: 90,
    backgroundColor: '#592540',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 11,
  },
  selectedTab: {
    backgroundColor: '#460b2a', 
  },
  browseLabel: {
    position: "relative",
    bottom: 15,
  },
  // Adjusted Browse icon
  browseIcon: {
    width: 85,
    height: 75,
    position: "relative",
    top: -2,
  },
  stageLabel: {
    position: "relative",
    bottom: 2,
  },
  // Adjusted Stage icon
  stageIcon: {
    width: 80,
    height: 60,
    position: "relative",
    top: 5,
  },
  icon: {
    width: 45,
    height: 45,
    tintColor: '#fff',
  },
  selectedIcon: {
    tintColor: undefined, // Allow the pink icon to show in its original colors
  },
  label: {
    fontSize: 10,
    marginTop: 8,
    color: '#fff',
    textTransform: 'uppercase',
  },
  selectedLabel: {
    fontWeight: 'bold',
    color: '#e98dbd', // Pink color for the selected label
  },
});

export { BottomNavbar };
