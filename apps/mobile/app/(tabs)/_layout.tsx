import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, View, StyleSheet } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

function TabIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -3 }} {...props} />;
}

function SearchTabIcon() {
  return (
    <View style={styles.searchButton}>
      <FontAwesome name="search" size={20} color="#fff" />
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: useClientOnlyValue(false, true),
        tabBarStyle: { paddingBottom: 4 },
        headerLeft: () => (
          <Pressable
            onPress={() => router.push('/menu')}
            style={styles.burgerWrap}
          >
            {({ pressed }) => (
              <FontAwesome
                name="bars"
                size={20}
                color={Colors[colorScheme ?? 'light'].text}
                style={{ opacity: pressed ? 0.5 : 1 }}
              />
            )}
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="all-items"
        options={{
          title: 'All Items',
          tabBarIcon: ({ color }) => <TabIcon name="list" color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '',
          tabBarIcon: () => <SearchTabIcon />,
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="locations"
        options={{
          title: 'Locations',
          tabBarIcon: ({ color }) => <TabIcon name="map-marker" color={color} />,
        }}
      />
      <Tabs.Screen
        name="labels"
        options={{
          title: 'Labels',
          tabBarIcon: ({ color }) => <TabIcon name="tag" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  burgerWrap: {
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
  },
  searchButton: {
    backgroundColor: '#2f95dc',
    borderRadius: 28,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#2f95dc',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
