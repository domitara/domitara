import { useState, useEffect, ReactNode } from 'react';
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
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Spotlight } from './Spotlight';
import { AppIcon } from './AppIcon';
import { auth } from '../auth';
import { useLabels, useLocations, useMe } from '../api/queries';

interface ShellProps {
  children: ReactNode;
}

export function DomitaraShell({ children }: ShellProps) {
  const [navOpen, { toggle: toggleNav }] = useDisclosure(true);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-mantine-color-scheme', dark ? 'dark' : 'light');
  }, [dark]);

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
          </Group>

          <button className="search-trigger" onClick={() => setSpotlightOpen(true)}>
            <IconSearch size={16} />
            <span style={{ flex: 1, color: 'var(--dt-fg-3)' }}>
              Search items, locations, labels…
            </span>
            <span className="kbd-hint">
              <span className="kbd">⌘</span>
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
              onClick={() => setDark((d) => !d)}
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
  const navigate = useNavigate();
  const { location } = useRouterState();
  const { data: locations = [] } = useLocations();
  const { data: labels = [] } = useLabels();
  const { data: me } = useMe();

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
            <button
              onClick={() => navigate({ to: '/locations' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 14px 5px 28px',
                color: 'var(--dt-fg-3)',
                fontSize: 12,
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <IconPlus size={12} />
              View all locations
            </button>
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
            <button
              onClick={() => navigate({ to: '/labels' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 14px 5px 28px',
                color: 'var(--dt-fg-3)',
                fontSize: 12,
                background: 'transparent',
                border: 0,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <IconPlus size={12} />
              View all labels
            </button>
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
        v0.1.0-dev
      </Text>
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
