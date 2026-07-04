const express = require("express");
const router = express.Router();
const { Op, fn, col } = require("sequelize");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

const COLOMBIA_TZ = "America/Bogota";

const ExcelJS = require("exceljs");
const { Asistencia, Estudiante, Evento, Usuario, Area } = require('../models/index');
const { verificarToken } = require("../middleware/auth");

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Registrar asistencia escaneando QR desde cliente
router.post("/registrar-qr", async (req, res) => {
  try {
    const { evento_id, codigo_carnet } = req.body;

    if (!evento_id || !codigo_carnet) {
      return res.status(400).json({
        success: false,
        message: "Evento y código de carnet son requeridos",
      });
    }

    const evento = await Evento.findByPk(evento_id);

    if (!evento) {
      return res.status(404).json({ success: false, message: "Evento no encontrado" });
    }

    if (req.usuario.rol === "profesional" && evento.creado_por_id !== req.usuario.id) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para tomar asistencia en este evento",
      });
    }

    if (req.usuario.rol === "coordinador" && parseInt(evento.area_id) !== parseInt(req.usuario.area_id)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para tomar asistencia en eventos de otra área",
      });
    }

    if (!evento.activo || evento.finalizado) {
      return res.status(400).json({
        success: false,
        message: "Este evento no está activo o ya ha finalizado",
      });
    }

    const estudiante = await Estudiante.findOne({
      where: {
        codigo_carnet: codigo_carnet.toUpperCase(),
        periodo: evento.periodo,
        activo: true
      }
    });

    if (!estudiante) {
      return res.status(404).json({
        success: false,
        message: "Estudiante no existe, no está matriculado en este periodo o carnet inválido",
        codigo_carnet,
        periodo: evento.periodo,
      });
    }

    const asistenciaExistente = await Asistencia.findOne({
      where: {
        evento_id: evento_id,
        estudiante_id: estudiante.id
      }
    });

    if (asistenciaExistente) {
      return res.status(400).json({
        success: false,
        message: "Este estudiante ya tiene asistencia registrada en este evento",
        estudiante: { nombre: estudiante.nombre, codigo: estudiante.codigo_carnet },
        fecha_registro: asistenciaExistente.fecha_registro,
      });
    }

    const nuevaAsistencia = await Asistencia.create({
      evento_id: evento_id,
      estudiante_id: estudiante.id,
      codigo_carnet_escaneado: codigo_carnet.toUpperCase(),
      tipo_registro: "manual_qr",
      registrado_por_id: req.usuario.id,
      fecha_registro: dayjs().toDate(),
    });

    res.json({
      success: true,
      message: "Asistencia registrada exitosamente",
      asistencia: nuevaAsistencia,
      estudiante: {
        nombre: estudiante.nombre,
        codigo: estudiante.codigo_carnet,
        identificacion: estudiante.identificacion,
      },
    });
  } catch (error) {
    console.error("Error al registrar asistencia QR:", error);
    res.status(500).json({
      success: false,
      message: "Error al registrar asistencia",
      error: error.message,
    });
  }
});

// Registrar asistencia manual por documento
router.post("/registrar-manual", async (req, res) => {
  try {
    const { evento_id, identificacion } = req.body;

    if (!evento_id || !identificacion) {
      return res.status(400).json({
        success: false,
        message: "Evento e identificación son requeridos",
      });
    }

    const evento = await Evento.findByPk(evento_id);

    if (!evento) {
      return res.status(404).json({ success: false, message: "Evento no encontrado" });
    }

    if (req.usuario.rol === "profesional" && evento.creado_por_id !== req.usuario.id) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para tomar asistencia en este evento",
      });
    }

    if (req.usuario.rol === "coordinador" && parseInt(evento.area_id) !== parseInt(req.usuario.area_id)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para tomar asistencia en eventos de otra área",
      });
    }

    if (!evento.activo || evento.finalizado) {
      return res.status(400).json({
        success: false,
        message: "Este evento no está activo o ya ha finalizado",
      });
    }

    const estudiante = await Estudiante.findOne({
      where: {
        identificacion: identificacion.toString(),
        periodo: evento.periodo,
        activo: true
      }
    });

    if (!estudiante) {
      return res.status(404).json({
        success: false,
        message: "Estudiante no existe o no está matriculado en este periodo",
        identificacion,
        periodo: evento.periodo,
      });
    }

    const asistenciaExistente = await Asistencia.findOne({
      where: {
        evento_id: evento.id,
        estudiante_id: estudiante.id
      }
    });

    if (asistenciaExistente) {
      return res.status(400).json({
        success: false,
        message: "Este estudiante ya está registrado en este evento",
        estudiante: {
          nombre: estudiante.nombre,
          codigo_carnet: estudiante.codigo_carnet,
          identificacion: estudiante.identificacion,
        },
        fecha_registro_anterior: asistenciaExistente.fecha_registro,
      });
    }

    const asistencia = await Asistencia.create({
      evento_id: evento.id,
      estudiante_id: estudiante.id,
      codigo_carnet_escaneado: estudiante.codigo_carnet,
      tipo_registro: "manual_documento",
      registrado_por_id: req.usuario.id,
    });

    console.log(`✅ Asistencia manual registrada: ${estudiante.nombre} — ${evento.nombre}`);

    res.json({
      success: true,
      message: "Asistencia registrada exitosamente",
      asistencia: {
        id: asistencia.id,
        estudiante: {
          nombre: estudiante.nombre,
          codigo_carnet: estudiante.codigo_carnet,
          identificacion: estudiante.identificacion,
          email: estudiante.email,
        },
        evento: { nombre: evento.nombre, fecha: evento.fecha },
        fecha_registro: asistencia.fecha_registro,
      },
    });
  } catch (error) {
    console.error("❌ Error al registrar asistencia manual:", error);
    res.status(500).json({
      success: false,
      message: "Error al registrar asistencia",
      error: error.message,
    });
  }
});

// Obtener eventos activos para tomar asistencia
router.get("/eventos-activos", async (req, res) => {
  try {
    const where = { activo: true, finalizado: false };

    if (req.usuario.rol === "profesional") {
      where.creado_por_id = req.usuario.id;
    } else if (req.usuario.rol === "coordinador") {
      where.area_id = req.usuario.area_id;
    }

    const eventos = await Evento.findAll({
      where,
      include: [
        { model: Area, as: 'Area', attributes: ['nombre', 'codigo', 'color'] },
        { model: Usuario, as: 'creador', attributes: ['nombre', 'apellidos', 'usuario'] }
      ],
      order: [['fecha', 'DESC'], ['hora_inicio', 'DESC']]
    });

    res.json({ success: true, count: eventos.length, eventos });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener eventos activos",
      error: error.message,
    });
  }
});

// Obtener asistencias de un evento
router.get("/evento/:eventoId", async (req, res) => {
  try {
    const asistencias = await Asistencia.findAll({
      where: { evento_id: req.params.eventoId },
      include: [{ model: Estudiante, as: 'Estudiante' }],
      order: [['fecha_registro', 'DESC']]
    });

    res.json({ success: true, count: asistencias.length, asistencias });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener asistencias",
      error: error.message,
    });
  }
});

// Obtener estadísticas de un evento
router.get("/evento/:eventoId/estadisticas", async (req, res) => {
  try {
    const totalAsistencias = await Asistencia.count({
      where: { evento_id: req.params.eventoId }
    });

    const asistenciasPorHora = await Asistencia.findAll({
      where: { evento_id: req.params.eventoId },
      attributes: [
        [fn('date_part', literal("'hour'"), col('fecha_registro')), 'hora'],
        [fn('COUNT', col('id')), 'count']
      ],
      group: [fn('date_part', literal("'hour'"), col('fecha_registro'))],
      order: [[literal('hora'), 'ASC']],
      raw: true
    });

    res.json({
      success: true,
      estadisticas: {
        total: totalAsistencias,
        por_hora: asistenciasPorHora,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas",
      error: error.message,
    });
  }
});

// Historial de asistencias de un estudiante
router.get("/estudiante/:estudianteId", async (req, res) => {
  try {
    const asistencias = await Asistencia.findAll({
      where: { estudiante_id: req.params.estudianteId },
      include: [{ model: Evento, as: 'Evento' }],
      order: [['fecha_registro', 'DESC']]
    });

    res.json({ success: true, count: asistencias.length, asistencias });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al obtener historial",
      error: error.message,
    });
  }
});

// Eliminar asistencia
router.delete("/:id", async (req, res) => {
  try {
    const asistencia = await Asistencia.findByPk(req.params.id);

    if (!asistencia) {
      return res.status(404).json({ success: false, message: "Asistencia no encontrada" });
    }

    await asistencia.destroy();

    res.json({ success: true, message: "Asistencia eliminada exitosamente" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar asistencia",
      error: error.message,
    });
  }
});

// Exportar asistencias a Excel
router.get("/evento/:eventoId/exportar", async (req, res) => {
  try {
    const evento = await Evento.findByPk(req.params.eventoId);
    if (!evento) {
      return res.status(404).json({ success: false, message: "Evento no encontrado" });
    }

    const asistencias = await Asistencia.findAll({
      where: { evento_id: req.params.eventoId },
      include: [{ model: Estudiante, as: 'Estudiante' }],
      order: [['fecha_registro', 'ASC']]
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Asistencias");

    worksheet.columns = [
      { header: "NOMBRES Y APELLIDOS", key: "nombre", width: 40 },
      { header: "DOCUMENTO DE IDENTIDAD", key: "identificacion", width: 20 },
      { header: "TIPO DE VINCULACION", key: "tipo_vinculacion", width: 25 },
      { header: "FACULTAD", key: "facultad", width: 30 },
      { header: "NOMBRE_PROGRAMA", key: "programa", width: 40 },
      { header: "SEM", key: "sem", width: 10 },
      { header: "CIRCUNSCRIPCION", key: "circunscripcion", width: 25 },
    ];

    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4CAF50" } };
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    asistencias.forEach((asistencia) => {
      const est = asistencia.Estudiante;
      if (est) {
        worksheet.addRow({
          nombre: est.nombre || "",
          identificacion: est.identificacion || "",
          tipo_vinculacion: est.tipo_vinculacion || "",
          facultad: est.facultad || "",
          programa: est.programa || "",
          sem: est.sem || "",
          circunscripcion: est.circunscripcion || "",
        });
      }
    });

    worksheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    const filename = `asistencias_${evento.nombre.replace(/\s+/g, "_")}_${dayjs().format("YYYY-MM-DD")}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error al exportar asistencias:", error);
    res.status(500).json({
      success: false,
      message: "Error al exportar asistencias",
      error: error.message,
    });
  }
});

module.exports = router;