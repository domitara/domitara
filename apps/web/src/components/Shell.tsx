import { useState, useEffect, ReactNode } from 'react';
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import { spotlightOpenAtom, activeHomeIdAtom, homesAtom } from '../store/atoms';
import {
  AppShell,
  Group,
  Text,
  ActionIcon,
  ScrollArea,
  Burger,
  NavLink as MantineNavLink,
  Divider,
  Avatar,
  Button,
  Menu,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconHome,
  IconBox,
  IconClipboard,
  IconQrcode,
  IconMapPin,
  IconTag,
  IconSettings,
  IconBell,
  IconHelp,
  IconMoon,
  IconSun,
  IconSearch,
  IconLogout,
  IconChevronDown,
  IconFolder,
  IconPlus,
  IconBuilding,
  IconCheck,
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Spotlight } from './Spotlight';
import { AppIcon } from './AppIcon';
import { NewLocationModal } from './NewLocationModal';
import { NewLabelModal } from './NewLabelModal';
import { auth } from '../auth';
import { useLabels, useLocations, useMe, useHomes, useVersion } from '../api/queries';

interface ShellProps {
  children: ReactNode;
}

export function DomitaraShell({ children }: ShellProps) {
  const [navOpen, { toggle: toggleNav }] = useDisclosure(true);
  const [spotlightOpen, setSpotlightOpen] = useAtom(spotlightOpenAtom);
  const [activeHomeId, setActiveHomeId] = useAtom(activeHomeIdAtom);
  const setHomes = useSetAtom(homesAtom);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: homes = [], isSuccess: homesLoaded } = useHomes();

  // Keep homesAtom in sync, clear stale activeHomeId, and auto-select a home if none is active
  useEffect(() => {
    if (!homesLoaded) return;
    setHomes(homes);
    if (activeHomeId && !homes.some((h) => h.id === activeHomeId)) {
      setActiveHomeId(null);
    } else if (homes.length > 0 && !activeHomeId) {
      setActiveHomeId(homes[0].id);
    }
  }, [homes, homesLoaded, activeHomeId, setActiveHomeId, setHomes]);

  const activeHome = homes.find((h) => h.id === activeHomeId) ?? homes[0];

  const handleSwitchHome = (id: string) => {
    setActiveHomeId(id);
    // Invalidate all data queries so they re-fetch with the new active home header
    void qc.invalidateQueries();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSpotlightOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <AppShell
        header={{ height: 56 }}
        navbar={{
          width: 260,
          breakpoint: 'sm',
          collapsed: { desktop: !navOpen, mobile: !navOpen },
        }}
        padding={0}
      >
        <AppShell.Header
          style={{
            borderBottom: '1px solid var(--dt-border)',
            background: 'var(--dt-bg)',
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 16,
            padding: '0 16px',
          }}
        >
          <Group gap={14}>
            <Burger opened={navOpen} onClick={toggleNav} size="sm" aria-label="Toggle navigation" />
            <Group gap={8}>
              <AppIcon size={22} />
              <Text className="brand-name">Domitara</Text>
            </Group>
            {homes.length > 0 && (
              <Menu shadow="md" width={220}>
                <Menu.Target>
                  <Button
                    variant="subtle"
                    color="gray"
                    size="xs"
                    leftSection={<IconBuilding size={14} />}
                    rightSection={<IconChevronDown size={12} />}
                    styles={{ root: { fontWeight: 500 } }}
                  >
                    {activeHome?.name ?? 'Select home'}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Your homes</Menu.Label>
                  {homes.map((h) => (
                    <Menu.Item
                      key={h.id}
                      leftSection={<IconBuilding size={14} />}
                      rightSection={h.id === activeHomeId ? <IconCheck size={14} /> : null}
                      onClick={() => handleSwitchHome(h.id)}
                    >
                      {h.name}
                    </Menu.Item>
                  ))}
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconPlus size={14} />}
                    onClick={() => navigate({ to: '/home/new' })}
                  >
                    Add home
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>

          <button className="search-trigger" onClick={() => setSpotlightOpen(true)}>
            <IconSearch size={16} />
            <span style={{ flex: 1, color: 'var(--dt-fg-3)' }}>
              Search items, locations, labels…
            </span>
            <span className="kbd-hint">
              <span className="kbd">
                {/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'}
              </span>
              <span className="kbd">K</span>
            </span>
          </button>

          <Group gap={4} justify="flex-end">
            <ActionIcon variant="subtle" color="gray" size="lg" title="Notifications">
              <IconBell size={18} />
            </ActionIcon>
            <ActionIcon variant="subtle" color="gray" size="lg" title="Help">
              <IconHelp size={18} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              title={dark ? 'Light mode' : 'Dark mode'}
              onClick={() => toggleColorScheme()}
            >
              {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar
          style={{ borderRight: '1px solid var(--dt-border)', background: 'var(--dt-bg)' }}
        >
          <Sidebar />
        </AppShell.Navbar>

        <AppShell.Main>
          <div className="dt-main-area" style={{ padding: 16 }}>
            {children}
          </div>
        </AppShell.Main>
      </AppShell>

      {spotlightOpen && <Spotlight onClose={() => setSpotlightOpen(false)} />}
    </>
  );
}

function Sidebar() {
  const [locOpen, setLocOpen] = useState(true);
  const [labelOpen, setLabelOpen] = useState(false);
  const [locModalOpen, setLocModalOpen] = useState(false);
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const navigate = useNavigate();
  const { location } = useRouterState();
  const { data: locations = [] } = useLocations();
  const { data: labels = [] } = useLabels();
  const { data: me } = useMe();
  const { data: version } = useVersion();
  const activeHomeId = useAtomValue(activeHomeIdAtom);
  const homes = useAtomValue(homesAtom);
  const activeHome = homes.find((h) => h.id === activeHomeId) ?? homes[0];

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');
  const isAdmin = auth.isAdmin();

  const handleLogout = async () => {
    await auth.logout();
    navigate({ to: '/login' });
  };

  const initials = (me?.name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const topLocations = locations.filter((l) => l.parent_id === null).slice(0, 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ScrollArea style={{ flex: 1 }} p={4}>
        <NavItem
          icon={<IconHome size={18} />}
          label="Dashboard"
          active={isActive('/dashboard')}
          onClick={() => navigate({ to: '/dashboard' })}
        />
        {activeHome && (
          <NavItem
            icon={<IconBuilding size={18} />}
            label={activeHome.name}
            active={isActive('/home')}
            onClick={() => navigate({ to: '/home' })}
          />
        )}
        <NavItem
          icon={<IconBox size={18} />}
          label="All items"
          active={isActive('/items')}
          onClick={() => navigate({ to: '/items' })}
          badge={undefined}
        />
        <NavItem
          icon={<IconClipboard size={18} />}
          label="Maintenance"
          active={isActive('/maintenance')}
          onClick={() => navigate({ to: '/maintenance' })}
        />
        <NavItem
          icon={<IconQrcode size={18} />}
          label="Asset IDs"
          active={isActive('/asset-ids')}
          onClick={() => navigate({ to: '/asset-ids' })}
        />

        <MantineNavLink
          label="Locations"
          leftSection={<IconMapPin size={18} />}
          rightSection={
            <IconChevronDown
              size={14}
              style={{
                transform: locOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform .15s',
              }}
            />
          }
          onClick={() => setLocOpen((v) => !v)}
          active={isActive('/locations')}
          style={{ borderRadius: 6, padding: '8px 14px' }}
        />
        {locOpen && (
          <div style={{ paddingLeft: 8 }}>
            {topLocations.map((l) => (
              <MantineNavLink
                key={l.id}
                label={l.name}
                leftSection={<IconFolder size={14} />}
                rightSection={
                  <Text size="xs" c="dimmed">
                    {l.item_count}
                  </Text>
                }
                onClick={() =>
                  navigate({ to: '/locations/$locationId', params: { locationId: l.id } })
                }
                style={{ borderRadius: 6, padding: '6px 14px 6px 28px', fontSize: 13 }}
              />
            ))}
            <div style={{ display: 'flex', gap: 4, padding: '4px 14px 4px 28px' }}>
              <button
                onClick={() => navigate({ to: '/locations' })}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 6px',
                  color: 'var(--dt-fg-3)',
                  fontSize: 12,
                  background: 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  borderRadius: 4,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--dt-gray-1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                View all locations
              </button>
              <button
                onClick={() => setLocModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 6px',
                  color: 'var(--dt-fg-3)',
                  fontSize: 12,
                  background: 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--dt-gray-1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <IconPlus size={12} />
                Add
              </button>
            </div>
          </div>
        )}

        <MantineNavLink
          label="Labels"
          leftSection={<IconTag size={18} />}
          rightSection={
            <IconChevronDown
              size={14}
              style={{
                transform: labelOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform .15s',
              }}
            />
          }
          onClick={() => setLabelOpen((v) => !v)}
          style={{ borderRadius: 6, padding: '8px 14px' }}
        />
        {labelOpen && (
          <div style={{ paddingLeft: 8 }}>
            {labels.slice(0, 5).map((l) => (
              <MantineNavLink
                key={l.id}
                label={l.name}
                leftSection={
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: l.color,
                      flexShrink: 0,
                    }}
                  />
                }
                rightSection={
                  <Text size="xs" c="dimmed">
                    {l.item_count}
                  </Text>
                }
                onClick={() => navigate({ to: '/labels/$labelId', params: { labelId: l.id } })}
                style={{ borderRadius: 6, padding: '6px 14px 6px 28px', fontSize: 13 }}
              />
            ))}
            <div style={{ display: 'flex', gap: 4, padding: '4px 14px 4px 28px' }}>
              <button
                onClick={() => navigate({ to: '/labels' })}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 6px',
                  color: 'var(--dt-fg-3)',
                  fontSize: 12,
                  background: 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  borderRadius: 4,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--dt-gray-1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                View all labels
              </button>
              <button
                onClick={() => setLabelModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 6px',
                  color: 'var(--dt-fg-3)',
                  fontSize: 12,
                  background: 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--dt-gray-1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <IconPlus size={12} />
                Add
              </button>
            </div>
          </div>
        )}

        {isAdmin && (
          <NavItem
            icon={<IconSettings size={18} />}
            label="Admin Settings"
            active={isActive('/settings')}
            onClick={() => navigate({ to: '/settings' })}
          />
        )}
      </ScrollArea>

      <Divider />
      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          onClick={() => navigate({ to: '/profile' })}
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: 6,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--dt-gray-1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Avatar size={30} radius="xl" color="blue">
            {initials}
          </Avatar>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm" fw={500} truncate>
              {me?.name ?? 'You'}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {me?.email ?? ''}
            </Text>
          </div>
        </div>
        <Button
          variant="light"
          color="red"
          size="sm"
          fullWidth
          leftSection={<IconLogout size={15} />}
          onClick={() => {
            void handleLogout();
          }}
        >
          Logout
        </Button>
      </div>
      <Text size="xs" c="dimmed" ta="center" pb="xs">
        {version?.version ? `Server v${version.version}` : 'Server …'}
      </Text>

      <NewLocationModal opened={locModalOpen} onClose={() => setLocModalOpen(false)} />
      <NewLabelModal opened={labelModalOpen} onClose={() => setLabelModalOpen(false)} />
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <MantineNavLink
      label={label}
      leftSection={icon}
      rightSection={
        badge ? (
          <Text
            size="xs"
            fw={600}
            c={active ? 'blue' : 'dimmed'}
            style={{
              background: 'var(--dt-gray-2)',
              borderRadius: 4,
              padding: '0 5px',
              lineHeight: '18px',
            }}
          >
            {badge}
          </Text>
        ) : undefined
      }
      active={active}
      onClick={onClick}
      style={{ borderRadius: 6, padding: '8px 14px' }}
    />
  );
}
