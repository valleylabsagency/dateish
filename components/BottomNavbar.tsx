// components/BottomNavbar.tsx
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
    //router.push(route);
  };

  return (
    <View style={styles.navbar}>
      {tabs.map((tab) => {
        const isSelected = tab.label === selectedTab;
        return (
          <TouchableOpacity
            key={tab.label}
            style={styles.tab}
            onPress={() => handleTabPress(tab.route)}
          >
            <Image
              source={tab.icon}
              style={[styles.icon, isSelected && styles.selectedIcon]}
              resizeMode="contain"
            />
            <Text style={[styles.label, isSelected && styles.selectedLabel]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    width: '100%',
    height: 70,
    backgroundColor: '#460b2a',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 30,
    height: 30,
    tintColor: '#fff',
  },
  selectedIcon: {
    tintColor: '#000', // Darker tint for the selected tab
  },
  label: {
    fontSize: 12,
    color: '#fff',
  },
  selectedLabel: {
    color: '#000', // Darker text for the selected tab
  },
});
