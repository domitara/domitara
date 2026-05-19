import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/context/auth';

export default function MenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  function go(href: string) {
    router.back();
    setTimeout(() => router.push(href as any), 50);
  }

  function handleLogout() {
    router.back();
    setTimeout(() => {
      logout();
      router.replace('/login');
    }, 50);
  }

  return (
    <View style={styles.overlay}>
      <View style={[styles.panel, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.appName}>Domitara</Text>
        <View style={styles.divider} />

        <MenuItem icon="wrench" label="Maintenance" onPress={() => go('/maintenance')} />
        <MenuItem icon="bolt" label="Electrical Panels" onPress={() => go('/electrical-panels')} />
        <MenuItem icon="qrcode" label="Asset IDs" onPress={() => go('/asset-ids')} />

        <View style={{ flex: 1 }} />
        <View style={styles.divider} />
        <MenuItem icon="sign-out" label="Sign Out" onPress={handleLogout} />
      </View>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
    >
      <FontAwesome name={icon} size={17} color="#555" style={styles.menuIcon} />
      <Text style={styles.menuLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  panel: {
    width: 265,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 4, height: 0 },
    elevation: 12,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#ebebeb',
    marginVertical: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  menuItemPressed: {
    backgroundColor: '#f4f4f4',
  },
  menuIcon: {
    width: 24,
    textAlign: 'center',
  },
  menuLabel: {
    fontSize: 16,
    color: '#222',
    marginLeft: 12,
    fontWeight: '500',
  },
});
