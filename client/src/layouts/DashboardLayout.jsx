import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  AppShell,
  Burger,
  Group,
  Title,
  NavLink,
  Avatar,
  Menu,
  Text,
  rem,
  UnstyledButton,
  Box,
  Image,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconDashboard,
  IconUsers,
  IconSchool,
  IconCalendarEvent,
  IconClipboardList,
  IconLogout,
  IconUser,
  IconChevronDown,
  IconPalette,
  IconQrcode
} from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.png'

const DashboardLayout = () => {
  const [opened, { toggle }] = useDisclosure()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { label: 'Dashboard',   icon: IconDashboard,      path: '/' },
    { label: 'Usuarios',    icon: IconUsers,           path: '/usuarios',    adminOnly: true },
    { label: 'Áreas',       icon: IconPalette,         path: '/areas',       adminOnly: true },
    { label: 'Estudiantes', icon: IconSchool,          path: '/estudiantes' },
    { label: 'Eventos',     icon: IconCalendarEvent,   path: '/eventos' },
    { label: 'Asistencias', icon: IconClipboardList,   path: '/asistencias' },
    { label: 'Escanear QR', icon: IconQrcode,          path: '/escanear-qr' }
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const filteredNavItems = navItems.filter(
    item => !item.adminOnly || user?.rol === 'administrador'
  )

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !opened }
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <Group gap="sm">
              <Image src={logo} alt="Unicordoba" h={50} w="auto" />
              <div>
                <Title order={4} c="green.7">Unicordoba</Title>
                <Text size="xs" c="dimmed">Sistema de Asistencia</Text>
              </div>
            </Group>
          </Group>

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <UnstyledButton>
                <Group gap="xs" wrap="nowrap">
                  <Avatar color="green" radius="xl" size="sm">
                    <IconUser size={16} />
                  </Avatar>
                  <Box visibleFrom="sm" style={{ minWidth: 0 }}>
                    <Text size="sm" fw={500} lineClamp={1}>{user?.usuario}</Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>{user?.rol}</Text>
                  </Box>
                  <IconChevronDown size={14} style={{ flexShrink: 0 }} />
                </Group>
              </UnstyledButton>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>
                <Text size="xs" fw={500}>{user?.usuario}</Text>
                <Text size="xs" c="dimmed">{user?.rol}</Text>
              </Menu.Label>
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
                onClick={handleLogout}
                color="red"
              >
                Cerrar Sesión
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow>
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              label={item.label}
              leftSection={<item.icon size={20} stroke={1.5} />}
              active={location.pathname === item.path}
              onClick={() => {
                navigate(item.path)
                toggle()
              }}
              variant="filled"
              color="green"
              style={{ borderRadius: '8px', marginBottom: '4px' }}
            />
          ))}
        </AppShell.Section>

        <AppShell.Section>
          <Box
            p="md"
            style={{
              background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
              borderRadius: '8px',
              textAlign: 'center'
            }}
          >
            <Text size="xs" c="green.9" fw={600}>Sistema de Asistencia</Text>
          </Box>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}

export default DashboardLayout