import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Text } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

const tabs = [
  { label: 'Games',       icon: require('../assets/images/icons/games-icon.png'),     route: '/games'    },
  { label: 'Inbox',       icon: require('../assets/images/icons/chats-icon.png'),     route: '/inbox'    },
  { label: 'Bar',         icon: require('../assets/images/icons/beers-icon.png'),     route: '/bar-2'      },
  { label: 'Mr. Mingles', icon: require('../assets/images/icons/mm-icon.png'),        route: '/mingles'  },
  { label: 'Events',      icon: require('../assets/images/icons/stage-tab-icon.png'), route: '/events'   },
];

export default function BottomNavbar({ selectedTab }: { selectedTab: string }) {
  const router = useRouter();
  const currentPath = usePathname();

  const handleTabPress = (route: string) => {
    if (route !== currentPath) router.push(route);
  };

  return (
    <View style={styles.navbar}>
      {tabs.map(tab => {
        const isSelected = currentPath === tab.route;
        const isBar      = tab.label === 'Bar';

        return (
          <TouchableOpacity
            key={tab.label}
            onPress={() => handleTabPress(tab.route)}
            style={[
              styles.tab,
              isSelected   && styles.selectedTab,
              isBar && isSelected && styles.barSelectedTab,
            ]}
          >
            <View style={styles.iconWrapper}>
              <Image
                source={tab.icon}
                resizeMode="contain"
                style={[
                  styles.icon,
                  isSelected          && styles.selectedIcon,
                  isBar               && styles.barIcon,
                  isBar && isSelected && styles.barSelectedIcon,
                ]}
              />
            </View>
            <Text style={[styles.label, isSelected && styles.selectedLabel, isBar && isSelected && styles.barSelectedLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const ICON_SIZE                = 40;
const BAR_ICON_SIZE            = 52;
const BAR_ICON_SELECTED_SIZE   = 90;   // <-- bump this if you want your bar icon even bigger
const BORDER_WIDTH             = 2;
const BAR_LIFT                 = -20;  // <-- how far to lift the Bar tab above the navbar
const PINK                      = '#e98dbd';
const DARK_BG                   = '#460b2a';

const styles = StyleSheet.create({
  navbar: {
    width: '100%',
    height: 80,
    backgroundColor: '#592540',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },

  // ALL selected tabs get this:
  selectedTab: {
    backgroundColor: DARK_BG,
    borderWidth: BORDER_WIDTH,
    borderColor: PINK,
    borderRadius: 25,
    height: "100%"
  },

  // ONLY the Bar tab (when selected) also gets lifted & slightly taller:
  barSelectedTab: {
    marginTop: BAR_LIFT,
    height: '125%',
    paddingTop: 15,
    flex: 1.7,
    zIndex: 1
  },

  barSelectedLabel: {
    fontSize: 18,
    marginTop: 5
  },

  iconWrapper: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    tintColor: '#fff',
  },
  selectedIcon: {
    tintColor: PINK,
  },

  // Bar’s normal selected size:
  barIcon: {
    width: BAR_ICON_SIZE,
    height: BAR_ICON_SIZE,
  },
  // Bar’s extra‐large selected size:
  barSelectedIcon: {
    width: BAR_ICON_SELECTED_SIZE,
    height: BAR_ICON_SELECTED_SIZE,
    marginBottom: 15,
  },

  label: {
    fontSize: 10,
    marginTop: 4,
    color: '#fff',
    textTransform: 'uppercase',
  },
  selectedLabel: {
    fontWeight: 'bold',
    color: PINK,
  },
});
