import { useEffect, useState } from "react";
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
  Select,
  Switch,
  Text,
  Card,
  Loader,
  Center,
  ScrollArea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import { usuariosService, areasService } from "../services/api";
import { useAuth } from "../context/AuthContext";

const Usuarios = () => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [editingUser, setEditingUser] = useState(null);

  const form = useForm({
    initialValues: {
      nombre: "",
      apellidos: "",
      cedula: "",
      cargo: "",
      area: "",
      usuario: "",
      contrasena: "",
      rol: "profesional",
      activo: true,
    },
    validate: {
      nombre: (value) => (!value ? "Nombre es requerido" : null),
      apellidos: (value) => (!value ? "Apellidos son requeridos" : null),
      cedula: (value) => (!value ? "Cédula es requerida" : null),
      cargo: (value) => (!value ? "Cargo es requerido" : null),
      area: (value) => (!value ? "Área es requerida" : null),
      usuario: (value) => (!value ? "Usuario es requerido" : null),
      contrasena: (value) => {
        if (!editingUser && !value) return "Contraseña es requerida";
        return null;
      },
    },
  });

  useEffect(() => {
    loadUsuarios();
    loadAreas();
  }, []);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const data = await usuariosService.getAll();
      setUsuarios(data.usuarios || []);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "No se pudieron cargar los usuarios",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAreas = async () => {
    try {
      const data = await areasService.getAll({ activo: true });
      setAreas(data.areas || []);
    } catch (error) {
      console.error("Error al cargar áreas:", error);
    }
  };

  const handleOpenModal = (usuario = null) => {
    if (usuario) {
      setEditingUser(usuario);
      form.setValues({
        nombre: usuario.nombre || "",
        apellidos: usuario.apellidos || "",
        cedula: usuario.cedula || "",
        cargo: usuario.cargo || "",
        area: usuario.area?.id || usuario.area || "",
        usuario: usuario.usuario,
        contrasena: "",
        rol: usuario.rol,
        activo: usuario.activo,
      });
    } else {
      setEditingUser(null);
      form.reset();
      // Si es coordinador, fijar su área
      if (user?.rol === "coordinador" && user?.area?._id) {
        form.setFieldValue("area", user.area.id);
        form.setFieldValue("rol", "profesional");
      }
    }
    openModal();
  };

  const handleSubmit = async (values) => {
    try {
      const dataToSend = { ...values };
      if (editingUser && !values.contrasena) {
        delete dataToSend.contrasena;
      }

      if (editingUser) {
        await usuariosService.update(editingUser.id, dataToSend);
        notifications.show({
          title: "Éxito",
          message: "Usuario actualizado correctamente",
          color: "green",
        });
      } else {
        await usuariosService.create(dataToSend);
        notifications.show({
          title: "Éxito",
          message: "Usuario creado correctamente",
          color: "green",
        });
      }

      closeModal();
      loadUsuarios();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error.message || "Error al guardar usuario",
        color: "red",
      });
    }
  };

  const handleDelete = (usuario) => {
    modals.openConfirmModal({
      title: "Eliminar Usuario",
      children: (
        <Text size="sm">
          ¿Estás seguro de que quieres eliminar el usuario{" "}
          <strong>
            {usuario.nombre} {usuario.apellidos}
          </strong>
          ?
        </Text>
      ),
      labels: { confirm: "Eliminar", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await usuariosService.delete(usuario.id);
          notifications.show({
            title: "Éxito",
            message: "Usuario eliminado correctamente",
            color: "green",
          });
          loadUsuarios();
        } catch (error) {
          notifications.show({
            title: "Error",
            message: "No se pudo eliminar el usuario",
            color: "red",
          });
        }
      },
    });
  };

  const getRolBadgeColor = (rol) => {
    switch (rol) {
      case "administrador":
        return "red";
      case "coordinador":
        return "blue";
      case "profesional":
        return "green";
      default:
        return "gray";
    }
  };

  const getRolLabel = (rol) => {
    switch (rol) {
      case "administrador":
        return "Administrador";
      case "coordinador":
        return "Coordinador";
      case "profesional":
        return "Profesional";
      default:
        return rol;
    }
  };

  const areasOptions = areas.map((area) => ({
    value: String(area.id),
    label: area.nombre,
  }));

  const rolesOptions =
    user?.rol === "coordinador"
      ? [{ value: "profesional", label: "Profesional" }]
      : [
          { value: "administrador", label: "Administrador" },
          { value: "coordinador", label: "Coordinador" },
          { value: "profesional", label: "Profesional" },
        ];

  const canDelete = user?.rol === "administrador";
  const canEditRole = user?.rol === "administrador";

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="green" size="xl" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={1} c="green.7">
            Usuarios
          </Title>
          <Text c="dimmed" size="sm">
            Gestión de usuarios del sistema
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => handleOpenModal()}
          color="green"
        >
          Nuevo Usuario
        </Button>
      </Group>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <ScrollArea>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ minWidth: 200 }}>Nombre Completo</Table.Th>
                <Table.Th style={{ minWidth: 120 }}>Cédula</Table.Th>
                <Table.Th style={{ minWidth: 120 }}>Usuario</Table.Th>
                <Table.Th style={{ minWidth: 150 }}>Cargo</Table.Th>
                <Table.Th style={{ minWidth: 130 }}>Área</Table.Th>
                <Table.Th style={{ minWidth: 120 }}>Rol</Table.Th>
                <Table.Th style={{ minWidth: 100 }}>Estado</Table.Th>
                <Table.Th style={{ minWidth: 120 }}>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {usuarios.map((usuario) => (
                <Table.Tr key={usuario.id}>
                  <Table.Td>
                    <Text fw={500}>
                      {usuario.nombre} {usuario.apellidos}
                    </Text>
                  </Table.Td>
                  <Table.Td>{usuario.cedula}</Table.Td>
                  <Table.Td>{usuario.usuario}</Table.Td>
                  <Table.Td>{usuario.cargo}</Table.Td>
                  <Table.Td>
                    <Badge
                      color={usuario.Area?.color || "cyan"}
                      variant="light"
                      style={{
                        backgroundColor: usuario.Area?.color
                          ? `${usuario.Area.color}15`
                          : undefined,
                      }}
                    >
                      {usuario.Area?.nombre || "-"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={getRolBadgeColor(usuario.rol)}
                      variant="light"
                    >
                      {getRolLabel(usuario.rol)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={usuario.activo ? "green" : "gray"}
                      variant="light"
                    >
                      {usuario.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => handleOpenModal(usuario)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      {canDelete && (
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => handleDelete(usuario)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={editingUser ? "Editar Usuario" : "Nuevo Usuario"}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Group grow>
              <TextInput
                label="Nombre"
                placeholder="Nombre"
                {...form.getInputProps("nombre")}
                required
              />

              <TextInput
                label="Apellidos"
                placeholder="Apellidos"
                {...form.getInputProps("apellidos")}
                required
              />
            </Group>

            <Group grow>
              <TextInput
                label="Cédula"
                placeholder="Número de cédula"
                {...form.getInputProps("cedula")}
                required
                disabled={editingUser} // No se puede cambiar la cédula al editar
              />

              <TextInput
                label="Cargo"
                placeholder="Cargo del usuario"
                {...form.getInputProps("cargo")}
                required
              />
            </Group>

            <Select
              label="Área de Bienestar"
              data={areasOptions}
              {...form.getInputProps("area")}
              required
              disabled={user?.rol === "coordinador"} // Coordinador no puede cambiar el área
            />

            <TextInput
              label="Usuario"
              placeholder="Nombre de usuario"
              {...form.getInputProps("usuario")}
              required
            />

            <TextInput
              label="Contraseña"
              type="password"
              placeholder={
                editingUser ? "Dejar vacío para no cambiar" : "Contraseña"
              }
              {...form.getInputProps("contrasena")}
              required={!editingUser}
            />

            <Select
              label="Rol"
              data={rolesOptions}
              {...form.getInputProps("rol")}
              required
              disabled={!canEditRole} // Solo admin puede cambiar rol
            />

            <Switch
              label="Activo"
              {...form.getInputProps("activo", { type: "checkbox" })}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" color="green">
                {editingUser ? "Actualizar" : "Crear"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
};

export default Usuarios;
