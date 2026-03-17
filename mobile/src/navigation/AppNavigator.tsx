import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { T } from '../theme/index';
import { DMScreen } from '../screens/DMScreen';
import { ChannelsScreen } from '../screens/ChannelsScreen';
import { ForumScreen } from '../screens/ForumScreen';
import { AIScreen } from '../screens/AIScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

interface Props { userId: string; username: string; }

export const AppNavigator = ({ userId, username }: Props) => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: 'rgba(11,14,17,0.97)',
        borderTopColor: 'rgba(255,255,255,0.08)',
        borderTopWidth: 1,
        height: 60,
        paddingBottom: 8,
      },
      tabBarActiveTintColor: T.accent,
      tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      tabBarIcon: ({ color, size, focused }) => {
        const icons: Record<string, [string, string]> = {
          Sohbet: ['chatbubble-ellipses', 'chatbubble-ellipses-outline'],
          Kanallar: ['grid', 'grid-outline'],
          Forum: ['people', 'people-outline'],
          Robot: ['hardware-chip', 'hardware-chip-outline'],
          Profil: ['person', 'person-outline'],
        };
        const [active, inactive] = icons[route.name] || ['ellipse', 'ellipse-outline'];
        return <Ionicons name={(focused ? active : inactive) as any} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Sohbet">{() => <DMScreen userId={userId} currentUserName={username} />}</Tab.Screen>
    <Tab.Screen name="Kanallar">{() => <ChannelsScreen userId={userId} username={username} />}</Tab.Screen>
    <Tab.Screen name="Forum">{() => <ForumScreen userId={userId} displayName={username} />}</Tab.Screen>
    <Tab.Screen name="Robot">{() => <AIScreen userId={userId} />}</Tab.Screen>
    <Tab.Screen name="Profil">{() => <ProfileScreen userId={userId} />}</Tab.Screen>
  </Tab.Navigator>
);
