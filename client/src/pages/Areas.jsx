import { useEffect, useState } from 'react'
import {
  Stack,
  Title,
  Button,
  Table,
  Badge,
  ActionIcon,
  Group,
  Modal,
  TextInput,
  Textarea,
  Switch,
  Text,
  Card,
  Loader,
  Center,
  ColorInput,
  ScrollArea
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconEdit, IconTrash, IconPalette } from '@tabler/icons-react'
import { areasService } from '../services/api'

const Areas = () => {
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const [editingArea, setEditingArea] = useState(null)

  const form = useForm({
    initialValues: {
      nombre: '',
      codigo: '',
      descripcion: '',
      color: '#4CAF50',
      activo: true
    },
    validate: {
      nombre: (value) => (!value ? 'Nombre es requerido' : null),
      codigo: (value) => {
        if (!value) return 'Código es requerido'
        if (value.length < 2) return 'El código debe tener al menos 2 caracteres'
        if (value.length > 5) return 'El código debe tener máximo 5 caracteres'
        return null
      }
    }
  })

  useEffect(() => {
    loadAreas()
  }, [])

  const loadAreas = async () => {
    try {
      setLoading(true)
      const data = await areasService.getAll()
      setAreas(data.areas || [])
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar las áreas',
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (area = null) => {
    if (area) {
      setEditingArea(area)
      form.setValues({
        nombre: area.nombre,
        codigo: area.codigo,
        descripcion: area.descripcion || '',
        color: area.color || '#4CAF50',
        activo: area.activo
      })
    } else {
      setEditingArea(null)
      form.reset()
    }
    openModal()
  }

  const handleSubmit = async (values) => {
    try {
      if (editingArea) {
        await areasService.update(editingArea.id, values)
        notifications.show({
          title: 'Éxito',
          message: 'Área actualizada correctamente',
          color: 'green'
        })
      } else {
        await areasService.create(values)
        notifications.show({
          title: 'Éxito',
          message: 'Área creada correctamente',
          color: 'green'
        })
      }

      closeModal()
      loadAreas()
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Error al guardar área',
        color: 'red'
      })
    }
  }

  const handleDelete = (area) => {
    modals.openConfirmModal({
      title: 'Eliminar Área',
      children: (
        <Text size="sm">
          ¿Estás seguro de que quieres eliminar el área <strong>{area.nombre}</strong>?
          <br /><br />
          <Text c="red" size="xs">
            Nota: No podrás eliminar esta área si tiene usuarios o eventos asociados.
          </Text>
        </Text>
      ),
      labels: { confirm: 'Eliminar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await areasService.delete(area.id)
          notifications.show({
            title: 'Éxito',
            message: 'Área eliminada correctamente',
            color: 'green'
          })
          loadAreas()
        } catch (error) {
          notifications.show({
            title: 'Error',
            message: error.message || 'No se pudo eliminar el área',
            color: 'red'
          })
        }
      }
    })
  }

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="green" size="xl" />
      </Center>
    )
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={1} c="green.7">
            Áreas de Bienestar
          </Title>
          <Text c="dimmed" size="sm">
            Gestión de áreas de bienestar universitario
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenModal()} color="green">
          Nueva Área
        </Button>
      </Group>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <ScrollArea>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ minWidth: 100 }}>Código</Table.Th>
                <Table.Th style={{ minWidth: 150 }}>Nombre</Table.Th>
                <Table.Th style={{ minWidth: 200 }}>Descripción</Table.Th>
                <Table.Th style={{ minWidth: 120 }}>Color</Table.Th>
                <Table.Th style={{ minWidth: 100 }}>Estado</Table.Th>
                <Table.Th style={{ minWidth: 120 }}>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {areas.map((area) => (
                <Table.Tr key={area.id}>
                  <Table.Td>
                    <Badge color={area.color} variant="filled">
                      {area.codigo}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500}>{area.nombre}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      {area.descripcion || 'Sin descripción'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: area.color,
                          border: '2px solid #e0e0e0'
                        }}
                      />
                      <Text size="xs" c="dimmed">{area.color}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={area.activo ? 'green' : 'gray'} variant="light">
                      {area.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => handleOpenModal(area)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => handleDelete(area)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        {areas.length === 0 && (
          <Center h={200}>
            <Stack align="center" gap="xs">
              <IconPalette size={48} color="gray" />
              <Text c="dimmed">No hay áreas registradas</Text>
              <Button
                variant="light"
                leftSection={<IconPlus size={16} />}
                onClick={() => handleOpenModal()}
                color="green"
              >
                Crear Primera Área
              </Button>
            </Stack>
          </Center>
        )}
      </Card>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={editingArea ? 'Editar Área' : 'Nueva Área'}
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Nombre"
              placeholder="Ej: Deporte, Cultura, Salud"
              {...form.getInputProps('nombre')}
              required
            />

            <TextInput
              label="Código"
              placeholder="Ej: DEP, CUL, SAL (2-5 caracteres)"
              {...form.getInputProps('codigo')}
              required
              maxLength={5}
              styles={{ input: { textTransform: 'uppercase' } }}
            />

            <Textarea
              label="Descripción"
              placeholder="Descripción del área de bienestar"
              {...form.getInputProps('descripcion')}
              minRows={3}
            />

            <ColorInput
              label="Color"
              placeholder="Selecciona un color"
              {...form.getInputProps('color')}
              format="hex"
              swatches={[
                '#FF5722',
                '#E91E63',
                '#9C27B0',
                '#673AB7',
                '#3F51B5',
                '#2196F3',
                '#03A9F4',
                '#00BCD4',
                '#009688',
                '#4CAF50',
                '#8BC34A',
                '#CDDC39',
                '#FFEB3B',
                '#FFC107',
                '#FF9800',
                '#FF5722'
              ]}
            />

            <Switch
              label="Activo"
              description="Solo las áreas activas podrán ser asignadas a usuarios y eventos"
              {...form.getInputProps('activo', { type: 'checkbox' })}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" color="green">
                {editingArea ? 'Actualizar' : 'Crear'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  )
}

export default Areas

