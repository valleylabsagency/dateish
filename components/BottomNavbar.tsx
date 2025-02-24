// BottomNavbar.tsx
import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Text } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

const tabs = [
  { label: 'Bar', icon: require('../assets/images/icons/bar-tab-icon.png'), route: '/bar' },
  { label: 'Browse', icon: require('../assets/images/icons/browse-tab-icon.png'), route: '/browse' },
  { label: 'Chats', icon: require('../assets/images/icons/chats-icon.png'), route: '/chats' },
  { label: 'Stage', icon: require('../assets/images/icons/stage-tab-icon.png'), route: '/stage' },
];

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
        // Conditionally add additional styles for "Browse" and "Stage"
        let labelAdditionalStyle = {};
        let iconAdditionalStyle = {};
        if (tab.label === "Browse") {
          labelAdditionalStyle = styles.browseLabel;
          iconAdditionalStyle = styles.browseIcon;
        } else if (tab.label === "Stage") {
          labelAdditionalStyle = styles.stageLabel;
          iconAdditionalStyle = styles.stageIcon;
        }
        const isSelected = tab.label === selectedTab;
        return (
          <TouchableOpacity
            key={tab.label}
            style={[styles.tab]}
            onPress={() => handleTabPress(tab.route)}
          >
            <Image
              source={tab.icon}
              style={[styles.icon, isSelected && styles.selectedIcon, iconAdditionalStyle]}
              resizeMode="contain"
            />
            <Text style={[styles.label, isSelected && styles.selectedLabel, labelAdditionalStyle]}>
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
    backgroundColor: '#460b2a',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  
  browseLabel: {
   position: "relative",
   bottom: 12
   
  },
  browseIcon: {
    width: 85,
    height: 85,
    position: "relative",
    top: 8,
  },
  
  stageLabel: {
    position: "relative",
    bottom: 6
  },
  stageIcon: {
    width: 80,
    height: 60,
    position: "relative",
    top: 2
  },
  icon: {
    width: 45,
    height: 45,
    tintColor: '#fff',
  },
  selectedIcon: {
    // Optionally add styling for selected icon here.
  },
  label: {
    fontSize: 10,
    marginTop: 8,
    color: '#fff',
    textTransform: 'uppercase',
  },
  selectedLabel: {
    // Optionally add styling for selected label here.
  },
});
