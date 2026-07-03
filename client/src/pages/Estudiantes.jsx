import { useEffect, useState } from 'react'
import {
  Stack,
  Title,
  TextInput,
  Table,
  Badge,
  Group,
  Text,
  Card,
  Pagination,
  Loader,
  Center,
  ScrollArea,
  Select
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconSearch } from '@tabler/icons-react'
import { estudiantesService } from '../services/api'

const Estudiantes = () => {
  const [estudiantes, setEstudiantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebouncedValue(search, 500)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [periodos, setPeriodos] = useState([])
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('')

  useEffect(() => {
    const init = async () => {
      await loadPeriodos()
    }
    init()
  }, [])

  useEffect(() => {
    loadEstudiantes()
  }, [page, debouncedSearch, periodoSeleccionado])

  const loadPeriodos = async () => {
    try {
      const data = await estudiantesService.getPeriodos()
      setPeriodos(data.periodos || [])
      if (data.periodos && data.periodos.length > 0) {
        setPeriodoSeleccionado(data.periodos[0])
      }
    } catch (error) {
      console.error('Error loading periodos:', error)
      notifications.show({
        title: 'Advertencia',
        message: 'No se pudieron cargar los periodos. Mostrando todos los estudiantes.',
        color: 'yellow'
      })
    }
  }

  const loadEstudiantes = async () => {
    try {
      setLoading(true)
      const params = { page, limit: 50, search: debouncedSearch }
      if (periodoSeleccionado) params.periodo = periodoSeleccionado
      const data = await estudiantesService.getAll(params)
      setEstudiantes(data.estudiantes || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Error loading estudiantes:', error)
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar los estudiantes',
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" wrap="wrap">
        <div>
          <Title order={1} c="green.7">
            Estudiantes
          </Title>
          <Text c="dimmed" size="sm">
            {total.toLocaleString()} estudiantes registrados {periodoSeleccionado && `- Periodo ${periodoSeleccionado}`}
          </Text>
        </div>
      </Group>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group mb="md" grow>
          <TextInput
            placeholder="Buscar por nombre, código, identificación o email..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="md"
          />
          <Select
            placeholder="Seleccionar periodo"
            data={periodos.map(p => ({ value: p, label: p }))}
            value={periodoSeleccionado}
            onChange={setPeriodoSeleccionado}
            size="md"
            clearable
          />
        </Group>

        {loading ? (
          <Center h={400}>
            <Loader color="green" size="xl" />
          </Center>
        ) : (
          <>
            <ScrollArea>
              <Table striped highlightOnHover horizontalSpacing="xs" verticalSpacing="xs" fontSize="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ minWidth: 200 }}>Nombre</Table.Th>
                    <Table.Th style={{ minWidth: 120 }}>Identificación</Table.Th>
                    <Table.Th style={{ minWidth: 130 }}>Código Carnet</Table.Th>
                    <Table.Th style={{ minWidth: 200 }}>Email</Table.Th>
                    <Table.Th style={{ minWidth: 150 }}>Tipo Vinculación</Table.Th>
                    <Table.Th style={{ minWidth: 180 }}>Facultad</Table.Th>
                    <Table.Th style={{ minWidth: 220 }}>Programa</Table.Th>
                    <Table.Th style={{ minWidth: 80 }}>Sem.</Table.Th>
                    <Table.Th style={{ minWidth: 150 }}>Circunscripción</Table.Th>
                    <Table.Th style={{ minWidth: 90 }}>Estado</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {estudiantes.map((estudiante) => (
                    <Table.Tr key={estudiante.id}>
                      <Table.Td>
                        <Text size="sm" lineClamp={1}>{estudiante.nombre}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs">{estudiante.tipo_identificacion}</Text>
                        <Text size="xs" c="dimmed">{estudiante.identificacion}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="green" size="sm">
                          {estudiante.codigo_carnet}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" lineClamp={1}>{estudiante.email}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" lineClamp={1}>{estudiante.tipo_vinculacion || '-'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" lineClamp={2}>{estudiante.facultad || '-'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" lineClamp={2}>{estudiante.programa || '-'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" ta="center">{estudiante.sem || '-'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" lineClamp={1}>{estudiante.circunscripcion || '-'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={estudiante.activo ? 'green' : 'gray'} variant="light" size="sm">
                          {estudiante.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            {totalPages > 1 && (
              <Group justify="center" mt="xl">
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={totalPages}
                  color="green"
                />
              </Group>
            )}
          </>
        )}
      </Card>
    </Stack>
  )
}

export default Estudiantes