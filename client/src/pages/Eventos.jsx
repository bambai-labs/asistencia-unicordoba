import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Select,
  Switch,
  Text,
  Card,
  Loader,
  Center,
  Image,
  FileButton,
  ScrollArea,
  NumberInput,
  Collapse,
  Paper,
} from "@mantine/core";
import { DatePickerInput, TimeInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconUpload,
  IconDownload,
  IconFilter,
  IconFilterOff,
} from "@tabler/icons-react";
import {
  eventosService,
  uploadService,
  asistenciaService,
  estudiantesService,
  areasService,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import dayjs from "dayjs";

const Eventos = () => {
  const { user } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [areas, setAreas] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [profesionales, setProfesionales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [editingEvento, setEditingEvento] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [exportandoEventoId, setExportandoEventoId] = useState(null);
  const [anioEvento, setAnioEvento] = useState(new Date().getFullYear());
  const [semestreEvento, setSemestreEvento] = useState("I");
  const [showFilters, setShowFilters] = useState(false);

  // Filtros
  const [filtroArea, setFiltroArea] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("");
  const [filtroProfesional, setFiltroProfesional] = useState("");

  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      nombre: "",
      descripcion: "",
      fecha: new Date(),
      hora_inicio: "",
      hora_fin: "",
      lugar: "",
      imagen_url: "",
      periodo: "",
      area: "",
      activo: true,
      finalizado: false,
    },
    validate: {
      nombre: (value) => (!value ? "Nombre es requerido" : null),
      fecha: (value) => (!value ? "Fecha es requerida" : null),
      hora_inicio: (value) => (!value ? "Hora de inicio es requerida" : null),
      hora_fin: (value) => (!value ? "Hora de fin es requerida" : null),
      lugar: (value) => (!value ? "Lugar es requerido" : null),
    },
  });

  useEffect(() => {
    loadEventos();
    loadAreas();
    loadPeriodos();
    loadProfesionales();
  }, []);

  useEffect(() => {
    // Recargar eventos cuando cambian los filtros
    loadEventos();
  }, [filtroArea, filtroPeriodo, filtroProfesional]);

  const loadEventos = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtroArea) params.area = filtroArea;
      if (filtroPeriodo) params.periodo = filtroPeriodo;
      if (filtroProfesional) params.profesional = filtroProfesional;

      const data = await eventosService.getAll(params);
      setEventos(data.eventos || []);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "No se pudieron cargar los eventos",
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
      console.error("Error loading areas:", error);
    }
  };

  const loadPeriodos = async () => {
    try {
      const data = await estudiantesService.getPeriodos();
      setPeriodos(data.periodos || []);
    } catch (error) {
      console.error("Error loading periodos:", error);
    }
  };

  const loadProfesionales = async () => {
    try {
      const data = await eventosService.getProfesionales();
      setProfesionales(data.profesionales || []);
    } catch (error) {
      console.error("Error loading profesionales:", error);
    }
  };

  const handleUploadImage = async (file) => {
    try {
      setUploadingImage(true);
      const response = await uploadService.uploadImage(file);
      form.setFieldValue("imagen_url", response.url);
      setImageFile(file);
      notifications.show({
        title: "Éxito",
        message: "Imagen subida correctamente",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "No se pudo subir la imagen",
        color: "red",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleOpenModal = (evento = null) => {
    if (evento) {
      setEditingEvento(evento);
      // Extraer año y semestre del periodo
      if (evento.periodo) {
        const [anio, sem] = evento.periodo.split("-");
        setAnioEvento(parseInt(anio));
        setSemestreEvento(sem);
      }
      form.setValues({
        nombre: evento.nombre,
        descripcion: evento.descripcion || "",
        fecha: new Date(evento.fecha),
        hora_inicio: evento.hora_inicio,
        hora_fin: evento.hora_fin,
        lugar: evento.lugar,
        imagen_url: evento.imagen_url || "",
        periodo: evento.periodo || "",
        area: evento.area?.id || evento.area || "",
        activo: evento.activo,
        finalizado: evento.finalizado,
      });
      setImageFile(null);
    } else {
      setEditingEvento(null);
      form.reset();
      setImageFile(null);
      setAnioEvento(new Date().getFullYear());
      setSemestreEvento("I");
    }
    openModal();
  };

  const handleSubmit = async (values) => {
    try {
      // Construir el periodo
      const periodo = `${anioEvento}-${semestreEvento}`;
      values.periodo = periodo;

      if (editingEvento) {
        await eventosService.update(editingEvento.id, values);
        notifications.show({
          title: "Éxito",
          message: "Evento actualizado correctamente",
          color: "green",
        });
      } else {
        await eventosService.create(values);
        notifications.show({
          title: "Éxito",
          message: "Evento creado correctamente",
          color: "green",
        });
      }

      closeModal();
      loadEventos();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error.message || "Error al guardar evento",
        color: "red",
      });
    }
  };

  const handleDelete = (evento) => {
    modals.openConfirmModal({
      title: "Eliminar Evento",
      children: (
        <Text size="sm">
          ¿Estás seguro de que quieres eliminar el evento{" "}
          <strong>{evento.nombre}</strong>?
        </Text>
      ),
      labels: { confirm: "Eliminar", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await eventosService.delete(evento.id);
          notifications.show({
            title: "Éxito",
            message: "Evento eliminado correctamente",
            color: "green",
          });
          loadEventos();
        } catch (error) {
          notifications.show({
            title: "Error",
            message: "No se pudo eliminar el evento",
            color: "red",
          });
        }
      },
    });
  };

  const handleExportarExcel = async (evento) => {
    try {
      setExportandoEventoId(evento.id);
      const blob = await asistenciaService.exportarExcel(evento.id);

      // Crear link de descarga
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `asistencias_${evento.nombre.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      notifications.show({
        title: "Éxito",
        message: "Asistencias exportadas correctamente",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "No se pudo exportar las asistencias",
        color: "red",
      });
    } finally {
      setExportandoEventoId(null);
    }
  };

  const handleClearFilters = () => {
    setFiltroArea("");
    setFiltroPeriodo("");
    setFiltroProfesional("");
  };

  if (loading && eventos.length === 0) {
    return (
      <Center h={400}>
        <Loader color="green" size="xl" />
      </Center>
    );
  }

  const areasOptions = areas.map((area) => ({
    value: String(area.id),
    label: area.nombre,
  }));

  const periodosOptions = periodos.map((p) => ({ value: p, label: p }));

  const profesionalesOptions = profesionales.map((p) => ({
    value: String(p.id),
    label: `${p.nombre} ${p.apellidos}${p.area?.nombre ? ` (${p.area.nombre})` : ""}`,
  }));

  // Determinar si mostrar filtros según el rol
  const mostrarFiltroArea = user?.rol === "administrador";
  const mostrarFiltroProfesional = user?.rol !== "profesional";

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={1} c="green.7">
            Eventos
          </Title>
          <Text c="dimmed" size="sm">
            Gestión de eventos universitarios
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => handleOpenModal()}
          color="green"
        >
          Nuevo Evento
        </Button>
      </Group>

      {/* Filtros */}
      <Paper shadow="xs" p="md" withBorder>
        <Group justify="space-between" mb={showFilters ? "md" : 0}>
          <Button
            variant="light"
            leftSection={
              showFilters ? (
                <IconFilterOff size={16} />
              ) : (
                <IconFilter size={16} />
              )
            }
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
          </Button>
          {(filtroArea || filtroPeriodo || filtroProfesional) && (
            <Button variant="subtle" color="gray" onClick={handleClearFilters}>
              Limpiar Filtros
            </Button>
          )}
        </Group>

        <Collapse in={showFilters}>
          <Group grow>
            {mostrarFiltroArea && (
              <Select
                label="Filtrar por Área"
                placeholder="Selecciona un área"
                data={areasOptions}
                value={filtroArea}
                onChange={setFiltroArea}
                clearable
              />
            )}
            <Select
              label="Filtrar por Periodo"
              placeholder="Selecciona un periodo"
              data={periodosOptions}
              value={filtroPeriodo}
              onChange={setFiltroPeriodo}
              clearable
            />
            {mostrarFiltroProfesional && (
              <Select
                label="Filtrar por Profesional"
                placeholder="Selecciona un profesional"
                data={profesionalesOptions}
                value={filtroProfesional}
                onChange={setFiltroProfesional}
                clearable
                searchable
              />
            )}
          </Group>
        </Collapse>
      </Paper>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <ScrollArea>
          <Table
            striped
            highlightOnHover
            horizontalSpacing="sm"
            verticalSpacing="xs"
            fontSize="sm"
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ minWidth: 200 }}>Nombre</Table.Th>
                <Table.Th style={{ minWidth: 140 }}>Fecha y Hora</Table.Th>
                <Table.Th style={{ minWidth: 150 }}>Lugar</Table.Th>
                <Table.Th style={{ minWidth: 100 }}>Periodo</Table.Th>
                {user?.rol !== "profesional" && (
                  <Table.Th style={{ minWidth: 150 }}>Creado por</Table.Th>
                )}
                <Table.Th style={{ minWidth: 110 }}>Estado</Table.Th>
                <Table.Th style={{ minWidth: 160 }}>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {eventos.map((evento) => (
                <Table.Tr key={evento.id}>
                  <Table.Td>
                    <Text fw={500} size="sm" lineClamp={1}>
                      {evento.nombre}
                    </Text>
                    {evento.descripcion && (
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {evento.descripcion}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs">
                      {dayjs(evento.fecha).format("DD/MM/YYYY")}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {evento.hora_inicio} - {evento.hora_fin}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" lineClamp={1}>
                      {evento.lugar}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="blue" size="sm">
                      {evento.periodo || "N/A"}
                    </Badge>
                  </Table.Td>
                  {user?.rol !== "profesional" && (
                    <Table.Td>
                      <Text size="xs" lineClamp={1}>
                        {evento.creador
                          ? `${evento.creador.nombre} ${evento.creador.apellidos}`
                          : "N/A"}
                      </Text>
                      {evento.creador?.area && (
                        <Badge
                          size="xs"
                          variant="dot"
                          color={evento.creador.area.color}
                          style={{
                            backgroundColor: `${evento.creador.area.color}15`,
                          }}
                        >
                          {evento.creador.area.nombre}
                        </Badge>
                      )}
                    </Table.Td>
                  )}
                  <Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          evento.finalizado
                            ? "blue"
                            : evento.activo
                              ? "green"
                              : "gray"
                        }
                        variant="light"
                        size="xs"
                      >
                        {evento.finalizado
                          ? "Finalizado"
                          : evento.activo
                            ? "Activo"
                            : "Inactivo"}
                      </Badge>
                    </Table.Td>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <ActionIcon
                        variant="light"
                        color="green"
                        onClick={() => navigate(`/eventos/${evento.id}`)}
                        title="Ver detalle"
                        size="sm"
                      >
                        <IconEye size={14} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="teal"
                        onClick={() => handleExportarExcel(evento)}
                        loading={exportandoEventoId === evento.id}
                        title="Exportar asistencias"
                        size="sm"
                      >
                        <IconDownload size={14} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => handleOpenModal(evento)}
                        title="Editar"
                        size="sm"
                      >
                        <IconEdit size={14} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => handleDelete(evento)}
                        title="Eliminar"
                        size="sm"
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        {eventos.length === 0 && !loading && (
          <Center h={200}>
            <Text c="dimmed">No se encontraron eventos</Text>
          </Center>
        )}
      </Card>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={editingEvento ? "Editar Evento" : "Nuevo Evento"}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Nombre del Evento"
              placeholder="Conferencia de Tecnología 2025"
              {...form.getInputProps("nombre")}
              required
            />

            <Textarea
              label="Descripción"
              placeholder="Descripción del evento"
              {...form.getInputProps("descripcion")}
              minRows={3}
            />

            <DatePickerInput
              label="Fecha"
              placeholder="Selecciona la fecha"
              {...form.getInputProps("fecha")}
              required
            />

            <Group grow>
              <TimeInput
                label="Hora de Inicio"
                {...form.getInputProps("hora_inicio")}
                required
              />
              <TimeInput
                label="Hora de Fin"
                {...form.getInputProps("hora_fin")}
                required
              />
            </Group>

            <TextInput
              label="Lugar"
              placeholder="Auditorio Principal"
              {...form.getInputProps("lugar")}
              required
            />

            <div>
              <Text size="sm" fw={500} mb="xs">
                Periodo Académico
              </Text>
              <Group grow>
                <NumberInput
                  label="Año"
                  placeholder="2025"
                  value={anioEvento}
                  onChange={setAnioEvento}
                  min={2020}
                  max={2050}
                  required
                />
                <Select
                  label="Semestre"
                  placeholder="Selecciona"
                  data={[
                    { value: "I", label: "I - Primer Semestre" },
                    { value: "II", label: "II - Segundo Semestre" },
                  ]}
                  value={semestreEvento}
                  onChange={setSemestreEvento}
                  required
                />
              </Group>
              <Badge size="md" variant="light" color="blue" mt="xs">
                Periodo: {anioEvento}-{semestreEvento}
              </Badge>
            </div>

            {user?.rol === "administrador" && (
              <Select
                label="Área"
                placeholder="Selecciona el área del evento"
                data={areasOptions}
                {...form.getInputProps("area")}
                searchable
                description="Solo el administrador puede cambiar el área del evento"
              />
            )}

            <div>
              <Text size="sm" fw={500} mb="xs">
                Imagen del Evento
              </Text>
              <FileButton onChange={handleUploadImage} accept="image/*">
                {(props) => (
                  <Button
                    {...props}
                    leftSection={<IconUpload size={16} />}
                    variant="light"
                    loading={uploadingImage}
                    fullWidth
                  >
                    Subir Imagen
                  </Button>
                )}
              </FileButton>
              {form.values.imagen_url && (
                <Image
                  src={`${form.values.imagen_url}`}
                  alt="Preview"
                  mt="sm"
                  radius="md"
                  h={200}
                  fit="cover"
                />
              )}
            </div>

            <Group grow>
              <Switch
                label="Activo"
                {...form.getInputProps("activo", { type: "checkbox" })}
              />
              <Switch
                label="Finalizado"
                {...form.getInputProps("finalizado", { type: "checkbox" })}
              />
            </Group>

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" color="green">
                {editingEvento ? "Actualizar" : "Crear"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
};

export default Eventos;
