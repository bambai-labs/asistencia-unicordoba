const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

const COLOMBIA_TZ = "America/Bogota";

const { Evento, Usuario, Area } = require('../models/index');
const { verificarToken } = require("../middleware/auth");

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Crear evento
router.post("/", async (req, res) => {
  try {
    const {
      nombre, descripcion, fecha, hora_inicio, hora_fin,
      fecha_hora_inicio, fecha_hora_fin, lugar, imagen_url,
      periodo, fotos_evidencia,
    } = req.body;

    if (!nombre || !fecha || !hora_inicio || !hora_fin || !lugar || !periodo) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos obligatorios son requeridos",
      });
    }

    let fechaHoraInicio, fechaHoraFin;

    if (fecha_hora_inicio) {
      fechaHoraInicio = dayjs.tz(fecha_hora_inicio, COLOMBIA_TZ).toDate();
    } else {
      const [horaI, minI] = hora_inicio.split(":");
      fechaHoraInicio = dayjs.tz(fecha, COLOMBIA_TZ)
        .hour(parseInt(horaI)).minute(parseInt(minI)).second(0).toDate();
    }

    if (fecha_hora_fin) {
      fechaHoraFin = dayjs.tz(fecha_hora_fin, COLOMBIA_TZ).toDate();
    } else {
      const [horaF, minF] = hora_fin.split(":");
      fechaHoraFin = dayjs.tz(fecha, COLOMBIA_TZ)
        .hour(parseInt(horaF)).minute(parseInt(minF)).second(0).toDate();
    }

    const evento = await Evento.create({
      nombre,
      descripcion,
      fecha,
      hora_inicio,
      hora_fin,
      fecha_hora_inicio: fechaHoraInicio,
      fecha_hora_fin:    fechaHoraFin,
      lugar,
      imagen_url,
      periodo,
      area_id:      req.usuario.area_id,
      creado_por_id: req.usuario.id,
      fotos_evidencia: fotos_evidencia || [],
      activo:    true,
      finalizado: false,
    });

    const eventoConRelaciones = await Evento.findByPk(evento.id, {
      include: [
        { model: Area,    as: 'Area',    attributes: ['nombre', 'codigo', 'color'] },
        { model: Usuario, as: 'creador', attributes: ['nombre', 'apellidos', 'usuario'] }
      ]
    });

    res.status(201).json({
      success: true,
      message: "Evento creado exitosamente",
      evento: eventoConRelaciones,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al crear evento",
      error: error.message,
    });
  }
});

// Listar eventos
router.get("/", async (req, res) => {
  try {
    const {
      activo, finalizado, fecha_desde, fecha_hasta,
      area, periodo, profesional,
    } = req.query;

    const where = {};

    if (req.usuario.rol === "profesional") {
      where.creado_por_id = req.usuario.id;
    } else if (req.usuario.rol === "coordinador") {
      where.area_id = req.usuario.area_id;
    }

    if (activo     !== undefined) where.activo     = activo     === "true";
    if (finalizado !== undefined) where.finalizado = finalizado === "true";
    if (area && req.usuario.rol === "administrador") where.area_id = area;
    if (periodo)    where.periodo      = periodo;
    if (profesional) where.creado_por_id = profesional;

    if (fecha_desde || fecha_hasta) {
      where.fecha = {};
      if (fecha_desde) where.fecha[Op.gte] = dayjs(fecha_desde).toDate();
      if (fecha_hasta) where.fecha[Op.lte] = dayjs(fecha_hasta).toDate();
    }

    const eventos = await Evento.findAll({
      where,
      include: [
        { model: Area,    as: 'Area',    attributes: ['nombre', 'codigo', 'color'] },
        { model: Usuario, as: 'creador', attributes: ['nombre', 'apellidos', 'usuario', 'area_id'] }
      ],
      order: [['fecha', 'DESC']]
    });

    res.json({
      success: true,
      count: eventos.length,
      eventos,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener eventos",
      error: error.message,
    });
  }
});

// Obtener evento por ID
router.get("/:id", async (req, res) => {
  try {
    const evento = await Evento.findByPk(req.params.id, {
      include: [
        { model: Area,    as: 'Area',    attributes: ['nombre', 'codigo', 'color'] },
        { model: Usuario, as: 'creador', attributes: ['nombre', 'apellidos', 'usuario', 'area_id'] }
      ]
    });

    if (!evento) {
      return res.status(404).json({ success: false, message: "Evento no encontrado" });
    }

    if (req.usuario.rol === "profesional" && evento.creado_por_id !== req.usuario.id) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para ver este evento",
      });
    }

    if (req.usuario.rol === "coordinador" && evento.area_id !== req.usuario.area_id) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para ver eventos de otra área",
      });
    }

    res.json({ success: true, evento });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener evento",
      error: error.message,
    });
  }
});

// Actualizar evento
router.put("/:id", async (req, res) => {
  try {
    const evento = await Evento.findByPk(req.params.id);

    if (!evento) {
      return res.status(404).json({ success: false, message: "Evento no encontrado" });
    }

    if (req.usuario.rol === "profesional" && evento.creado_por_id !== req.usuario.id) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para actualizar este evento",
      });
    }

    if (req.usuario.rol === "coordinador" && evento.area_id !== req.usuario.area_id) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para actualizar eventos de otra área",
      });
    }

    if (req.body.area && req.usuario.rol !== "administrador") {
      return res.status(403).json({
        success: false,
        message: "Solo el administrador puede cambiar el área del evento",
      });
    }

    const updateData = { ...req.body };
    if (req.body.area) {
      updateData.area_id = req.body.area;
      delete updateData.area;
    }

    if (req.body.fecha || req.body.hora_inicio || req.body.hora_fin) {
      const fechaBase = req.body.fecha
        ? dayjs.tz(req.body.fecha, COLOMBIA_TZ)
        : dayjs(evento.fecha).tz(COLOMBIA_TZ);

      const horaInicio = req.body.hora_inicio || evento.hora_inicio;
      const horaFin    = req.body.hora_fin    || evento.hora_fin;

      const [horaI, minI] = horaInicio.split(":");
      updateData.fecha_hora_inicio = fechaBase
        .hour(parseInt(horaI)).minute(parseInt(minI)).second(0).toDate();

      const [horaF, minF] = horaFin.split(":");
      updateData.fecha_hora_fin = fechaBase
        .hour(parseInt(horaF)).minute(parseInt(minF)).second(0).toDate();
    }

    await evento.update(updateData);

    const eventoActualizado = await Evento.findByPk(evento.id, {
      include: [
        { model: Area,    as: 'Area',    attributes: ['nombre', 'codigo', 'color'] },
        { model: Usuario, as: 'creador', attributes: ['nombre', 'apellidos', 'usuario'] }
      ]
    });

    res.json({
      success: true,
      message: "Evento actualizado exitosamente",
      evento: eventoActualizado,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar evento",
      error: error.message,
    });
  }
});

// Eliminar evento
router.delete("/:id", async (req, res) => {
  try {
    const evento = await Evento.findByPk(req.params.id);

    if (!evento) {
      return res.status(404).json({ success: false, message: "Evento no encontrado" });
    }

    if (req.usuario.rol === "profesional" && evento.creado_por_id !== req.usuario.id) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para eliminar este evento",
      });
    }

    if (req.usuario.rol === "coordinador" && evento.area_id !== req.usuario.area_id) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para eliminar eventos de otra área",
      });
    }

    await evento.destroy();

    res.json({ success: true, message: "Evento eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar evento",
      error: error.message,
    });
  }
});

// Añadir foto de evidencia
router.post("/:id/fotos", async (req, res) => {
  try {
    const { url, descripcion } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, message: "La URL de la foto es requerida" });
    }

    const evento = await Evento.findByPk(req.params.id);

    if (!evento) {
      return res.status(404).json({ success: false, message: "Evento no encontrado" });
    }

    if (req.usuario.rol === "profesional" && evento.creado_por_id !== req.usuario.id) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para añadir fotos a este evento",
      });
    }

    if (req.usuario.rol === "coordinador" && evento.area_id !== req.usuario.area_id) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para añadir fotos a eventos de otra área",
      });
    }

    const fotosActuales = evento.fotos_evidencia || [];
    fotosActuales.push({
      url,
      descripcion:  descripcion || "",
      fecha_subida: dayjs().toDate()
    });

    await evento.update({ fotos_evidencia: fotosActuales });

    res.json({ success: true, message: "Foto añadida exitosamente", evento });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al añadir foto",
      error: error.message,
    });
  }
});

// Eliminar foto de evidencia
router.delete("/:id/fotos/:fotoIndex", async (req, res) => {
  try {
    const evento = await Evento.findByPk(req.params.id);

    if (!evento) {
      return res.status(404).json({ success: false, message: "Evento no encontrado" });
    }

    if (req.usuario.rol === "profesional" && evento.creado_por_id !== req.usuario.id) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para eliminar fotos de este evento",
      });
    }

    if (req.usuario.rol === "coordinador" && evento.area_id !== req.usuario.area_id) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para eliminar fotos de eventos de otra área",
      });
    }

    const fotosActuales = evento.fotos_evidencia || [];
    const fotoIndex = fotosActuales.findIndex(
      (foto) => foto.url === req.params.fotoIndex
    );

    if (fotoIndex === -1) {
      return res.status(404).json({ success: false, message: "Foto no encontrada" });
    }

    fotosActuales.splice(fotoIndex, 1);
    await evento.update({ fotos_evidencia: fotosActuales });

    res.json({ success: true, message: "Foto eliminada exitosamente", evento });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar foto",
      error: error.message,
    });
  }
});

// Obtener lista de profesionales para filtros
router.get("/filtros/profesionales", async (req, res) => {
  try {
    const where = { rol: "profesional" };

    if (req.usuario.rol === "coordinador") {
      where.area_id = req.usuario.area_id;
    }

    const profesionales = await Usuario.findAll({
      where,
      attributes: ['id', 'nombre', 'apellidos', 'usuario', 'area_id'],
      order: [['nombre', 'ASC']]
    });

    res.json({ success: true, profesionales });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener profesionales",
      error: error.message,
    });
  }
});

module.exports = router;