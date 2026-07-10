import { FontAwesome6 } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { colors, radii } from '@/theme/tokens';

export default function TabsLayout() {
  const { token, household, booting } = useAuth();

  if (!booting && !token) return <Redirect href="/(auth)/welcome" />;
  if (!booting && token && !household) return <Redirect href="/(auth)/wg-setup" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: 'transparent',
          minHeight: 72,
          paddingTop: 8,
          paddingBottom: 10,
          marginHorizontal: 14,
          marginBottom: 10,
          borderRadius: radii.hero,
          position: 'absolute'
        },
        tabBarLabelStyle: {
          fontWeight: '800'
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Start',
          tabBarIcon: ({ color }) => <FontAwesome6 name="house" size={20} color={color} />
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Aufgaben',
          tabBarIcon: ({ color }) => <FontAwesome6 name="list-check" size={20} color={color} />
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Ausgaben',
          tabBarIcon: ({ color }) => <FontAwesome6 name="wallet" size={20} color={color} />
        }}
      />
      <Tabs.Screen
        name="wg"
        options={{
          title: 'WG',
          tabBarIcon: ({ color }) => <FontAwesome6 name="people-roof" size={20} color={color} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <FontAwesome6 name="circle-user" size={20} color={color} />
        }}
      />
    </Tabs>
  );
}
