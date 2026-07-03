import { useEffect, useState } from 'react'
import {
  Stack,
  Title,
  Select,
  Table,
  Badge,
  Text,
  Card,
  Loader,
  Center,
  Group,
  ScrollArea,
  Button,
  TextInput,
  Tabs,
  Alert
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { eventosService, asistenciaService } from '../services/api'
import dayjs from 'dayjs'
import { IconQrcode, IconId, IconAlertCircle } from '@tabler/icons-react'

const Asistencias = () => {
  const [eventosActivos, setEventosActivos] = useState([])
  const [selectedEvento, setSelectedEvento] = useState(null)
  const [asistencias, setAsistencias] = useState([])
  const [loading, setLoading] = useState(false)
  const [registrandoAsistencia, setRegistrandoAsistencia] = useState(false)
  const [identificacionManual, setIdentificacionManual] = useState('')

  useEffect(() => {
    loadEventosActivos()
  }, [])

  useEffect(() => {
    if (selectedEvento) {
      loadAsistencias(true) // Mostrar loader en carga inicial

      // Actualizar asistencias cada 2 segundos sin loader
      const interval = setInterval(() => {
        loadAsistencias(false) // No mostrar loader en actualizaciones automáticas
      }, 2000)

      // Limpiar intervalo al desmontar o cambiar evento
      return () => clearInterval(interval)
    } else {
      // Limpiar asistencias si no hay evento seleccionado
      setAsistencias([])
    }
  }, [selectedEvento])

  const loadEventosActivos = async () => {
    try {
      const data = await asistenciaService.getEventosActivos()
      setEventosActivos(data.eventos || [])
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar los eventos activos',
        color: 'red'
      })
    }
  }

  const loadAsistencias = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true)
      const data = await asistenciaService.getByEvento(selectedEvento)
      setAsistencias(data.asistencias || [])
    } catch (error) {
      if (showLoader) {
        notifications.show({
          title: 'Error',
          message: 'No se pudieron cargar las asistencias',
          color: 'red'
        })
      }
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  const handleRegistrarAsistenciaManual = async () => {
    if (!identificacionManual || !selectedEvento) {
      notifications.show({
        title: 'Error',
        message: 'Debes seleccionar un evento e ingresar una identificación',
        color: 'red'
      })
      return
    }

    try {
      setRegistrandoAsistencia(true)
      await asistenciaService.registrarManual({
        evento_id: selectedEvento,
        identificacion: identificacionManual
      })

      notifications.show({
        title: 'Éxito',
        message: 'Asistencia registrada correctamente',
        color: 'green'
      })

      setIdentificacionManual('')
      loadAsistencias(false) // Recargar asistencias sin loader
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Error al registrar asistencia',
        color: 'red'
      })
    } finally {
      setRegistrandoAsistencia(false)
    }
  }

  const eventosOptions = eventosActivos.map(e => ({
    value: String(e.id),
    label: `${e.nombre} - ${dayjs(e.fecha).format('DD/MM/YYYY')} ${e.hora_inicio}`
  }))

  return (
    <Stack gap="lg">
      <div>
        <Title order={1} c="green.7">
          Asistencias
        </Title>
        <Text c="dimmed" size="sm">
          Consulta y toma de asistencias por evento
        </Text>
      </div>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Select
            label="Selecciona un Evento"
            placeholder="Elige el evento a consultar"
            data={eventosOptions}
            value={selectedEvento}
            onChange={setSelectedEvento}
            searchable
            clearable
            size="md"
          />

          {eventosActivos.length === 0 && (
            <Alert icon={<IconAlertCircle size={16} />} title="Sin eventos activos" color="blue">
              No hay eventos activos en este momento. Solo los eventos activos y no finalizados aparecen en esta lista.
            </Alert>
          )}
        </Stack>
      </Card>

      {selectedEvento && (
        <>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={3} mb="md">Tomar Asistencia Manual</Title>
            <Text size="sm" c="dimmed" mb="md">
              Registra la asistencia ingresando el número de documento del estudiante
            </Text>

            <Group>
              <TextInput
                placeholder="Número de cédula del estudiante"
                value={identificacionManual}
                onChange={(e) => setIdentificacionManual(e.target.value)}
                leftSection={<IconId size={16} />}
                style={{ flex: 1 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRegistrarAsistenciaManual()
                  }
                }}
              />
              <Button
                onClick={handleRegistrarAsistenciaManual}
                loading={registrandoAsistencia}
                color="green"
              >
                Registrar
              </Button>
            </Group>

            <Alert icon={<IconQrcode size={16} />} color="blue" mt="md">
              <Text size="sm">
                <strong>Nota:</strong> También puedes escanear el QR del carnet desde la sección Escanear QR.
              </Text>
            </Alert>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={3}>Registros de Asistencia</Title>
              <Badge size="lg" color="green">
                {asistencias.length} asistencias
              </Badge>
            </Group>

            {loading ? (
              <Center h={300}>
                <Loader color="green" size="xl" />
              </Center>
            ) : asistencias.length === 0 ? (
              <Center h={300}>
                <Text c="dimmed">No hay asistencias registradas para este evento</Text>
              </Center>
            ) : (
              <ScrollArea>
                <Table striped highlightOnHover horizontalSpacing="xs" verticalSpacing="xs" fontSize="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ width: 50 }}>#</Table.Th>
                      <Table.Th style={{ minWidth: 250 }}>Estudiante</Table.Th>
                      <Table.Th style={{ minWidth: 130 }}>Código Carnet</Table.Th>
                      <Table.Th style={{ minWidth: 120 }}>Identificación</Table.Th>
                      <Table.Th style={{ minWidth: 200 }}>Email</Table.Th>
                      <Table.Th style={{ minWidth: 150 }}>Fecha Registro</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {asistencias.map((asistencia, index) => (
                      <Table.Tr key={asistencia.id}>
                        <Table.Td>{index + 1}</Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500} lineClamp={1}>{asistencia.Estudiante?.nombre}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" color="green" size="sm">
                            {asistencia.codigo_carnet_escaneado}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs">{asistencia.Estudiante?.identificacion}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" lineClamp={1}>{asistencia.Estudiante?.email}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs">
                            {dayjs(asistencia.fecha_registro).format('DD/MM/YYYY HH:mm:ss')}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}
          </Card>
        </>
      )}
    </Stack>
  )
}

export default Asistencias
