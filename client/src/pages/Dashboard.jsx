import { useEffect, useState } from "react";
import {
  Grid,
  Card,
  Title,
  Text,
  Group,
  Stack,
  ThemeIcon,
  RingProgress,
  Center,
  Loader,
} from "@mantine/core";
import {
  IconSchool,
  IconCalendarEvent,
  IconClipboardCheck,
} from "@tabler/icons-react";
import { estudiantesService, eventosService } from "../services/api";

const StatCard = ({ title, value, icon: Icon, color, loading }) => (
  <Card shadow="sm" padding="lg" radius="md" withBorder>
    <Group justify="apart">
      <div>
        <Text c="dimmed" size="sm" fw={500} tt="uppercase">
          {title}
        </Text>
        <Title order={2} mt="xs">
          {loading ? <Loader size="sm" /> : value.toLocaleString()}
        </Title>
      </div>
      <ThemeIcon color={color} size={60} radius="md" variant="light">
        <Icon size={30} stroke={1.5} />
      </ThemeIcon>
    </Group>
  </Card>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    estudiantes: 0,
    eventosActivos: 0,
    eventosTotal: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [
        estudiantesData,
        eventosActivosData,
        eventosTotalData,
      ] = await Promise.all([
        estudiantesService.getAll({ limit: 1 }),
        eventosService.getAll({ activo: true, finalizado: false }),
        eventosService.getAll(),
      ]);

      setStats({
        estudiantes: estudiantesData.total || 0,
        eventosActivos: eventosActivosData.count || 0,
        eventosTotal: eventosTotalData.count || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const eventosPercentage =
    stats.eventosTotal > 0
      ? (stats.eventosActivos / stats.eventosTotal) * 100
      : 0;

  return (
    <Stack gap="lg">
      <div>
        <Title order={1} c="green.7">
          Dashboard
        </Title>
        <Text c="dimmed" size="sm">
          Vista general del sistema de asistencia
        </Text>
      </div>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
          <StatCard
            title="Estudiantes"
            value={stats.estudiantes}
            icon={IconSchool}
            color="blue"
            loading={loading}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
          <StatCard
            title="Eventos Activos"
            value={stats.eventosActivos}
            icon={IconCalendarEvent}
            color="green"
            loading={loading}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
          <StatCard
            title="Total Eventos"
            value={stats.eventosTotal}
            icon={IconClipboardCheck}
            color="orange"
            loading={loading}
          />
        </Grid.Col>
      </Grid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={3} mb="md">
              Eventos Activos
            </Title>
            <Center>
              <RingProgress
                size={180}
                thickness={16}
                sections={[{ value: eventosPercentage, color: "green" }]}
                label={
                  <Center>
                    <Stack gap={0} align="center">
                      <Text size="xl" fw={700} c="green">
                        {stats.eventosActivos}
                      </Text>
                      <Text size="sm" c="dimmed">
                        de {stats.eventosTotal}
                      </Text>
                    </Stack>
                  </Center>
                }
              />
            </Center>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={3} mb="md">
              Sistema Operativo
            </Title>
            <Stack gap="md">
              <Group justify="apart">
                <Text size="sm">Base de Datos</Text>
                <Text size="sm" fw={600} c="green">
                  Activa
                </Text>
              </Group>
              <Group justify="apart">
                <Text size="sm">API Backend</Text>
                <Text size="sm" fw={600} c="green">
                  Operativa
                </Text>
              </Group>
              <Group justify="apart">
                <Text size="sm">Estudiantes Sincronizados</Text>
                <Text size="sm" fw={600} c="green">
                  {stats.estudiantes.toLocaleString()}
                </Text>
              </Group>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={3} mb="md">
          Información del Sistema
        </Title>
        <Text size="sm" c="dimmed">
          Sistema de Asistencia a Eventos desarrollado para la Unicordoba. Este
          dashboard proporciona una vista general del estado del sistema y sus
          componentes principales.
        </Text>
      </Card>
    </Stack>
  );
};

export default Dashboard;
