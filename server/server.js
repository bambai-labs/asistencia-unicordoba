require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const dayjs = require("dayjs");
const { connectDB } = require("./config/database");
const { iniciarWorker } = require("./workers/finalizarEventos");

// Importar rutas
const authRoutes = require("./routes/auth");
const usuariosRoutes = require("./routes/usuarios");
const estudiantesRoutes = require("./routes/estudiantes");
const eventosRoutes = require("./routes/eventos");
const asistenciaRoutes = require("./routes/asistencia");
const uploadRoutes = require("./routes/upload");
const areasRoutes = require("./routes/areas");

require('./models/index');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS
app.use(cors({
	origin: "*",
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (imágenes)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Logging middleware
app.use((req, res, next) => {
	console.log(
		`${dayjs().format("YYYY-MM-DD HH:mm:ss")} - ${req.method} ${req.path}`
	);
	next();
});

// Rutas de la API
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/estudiantes", estudiantesRoutes);
app.use("/api/eventos", eventosRoutes);
app.use("/api/asistencia", asistenciaRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/areas", areasRoutes);

// Ruta raíz con documentación de la API
app.get("/", (req, res) => {
	res.json({
		message: "🎓 Sistema de Asistencia - Unicordoba",
		version: "1.0.0",
		endpoints: {
			Autenticación: {
				"POST /api/auth/login": "Iniciar sesión",
				"GET /api/auth/me": "Obtener usuario actual (requiere token)",
			},
			Usuarios: {
				"POST /api/usuarios": "Crear usuario (admin)",
				"GET /api/usuarios": "Listar usuarios (admin)",
				"PUT /api/usuarios/:id": "Actualizar usuario (admin)",
				"DELETE /api/usuarios/:id": "Eliminar usuario (admin)",
			},
			Estudiantes: {
				"GET /api/estudiantes": "Listar estudiantes (autenticado)",
				"GET /api/estudiantes/:id": "Obtener estudiante (autenticado)",
				"GET /api/estudiantes/codigo/:codigo":
					"Buscar por código de carnet (autenticado)",
				"PUT /api/estudiantes/:id": "Actualizar estudiante (autenticado)",
			},
			Eventos: {
				"POST /api/eventos": "Crear evento (autenticado)",
				"GET /api/eventos": "Listar eventos (autenticado)",
				"GET /api/eventos/:id": "Obtener evento (autenticado)",
				"PUT /api/eventos/:id": "Actualizar evento (autenticado)",
				"DELETE /api/eventos/:id": "Eliminar evento (autenticado)",
			},
			Asistencia: {
				"GET /api/asistencia/evento/:eventoId":
					"Asistencias de un evento (autenticado)",
				"GET /api/asistencia/evento/:eventoId/estadisticas":
					"Estadísticas de evento (autenticado)",
				"GET /api/asistencia/estudiante/:estudianteId":
					"Historial de estudiante (autenticado)",
				"DELETE /api/asistencia/:id": "Eliminar asistencia (autenticado)",
			},
			Upload: {
				"POST /api/upload": "Subir imagen (autenticado)",
				"DELETE /api/upload/:filename": "Eliminar imagen (autenticado)",
			},
			Areas: {
				"GET /api/areas": "Listar áreas (autenticado)",
				"GET /api/areas/:id": "Obtener área (autenticado)",
				"POST /api/areas": "Crear área (admin)",
				"PUT /api/areas/:id": "Actualizar área (admin)",
				"DELETE /api/areas/:id": "Eliminar área (admin)",
			},
		},
		notas: {
			autenticacion: "Incluir header: Authorization: Bearer <token>",
			sincronizar_estudiantes: "Pendiente: integración con API universitaria",
		},
	});
});

// Manejo de rutas no encontradas
app.use((req, res) => {
	res.status(404).json({
		success: false,
		message: "Endpoint no encontrado",
	});
});

// Manejo global de errores
app.use((err, req, res, next) => {
	console.error("Error:", err);
	res.status(500).json({
		success: false,
		message: "Error interno del servidor",
		error: process.env.NODE_ENV === "development" ? err.message : undefined,
	});
});

// Iniciar servidor
const iniciarServidor = async () => {
  try {
    await connectDB();
    iniciarWorker();
    app.listen(PORT, "0.0.0.0", () => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🎓 Sistema de Asistencia - Unicordoba");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`📡 Servidor escuchando en puerto: ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`🗄️  Base de datos: PostgreSQL`);
      console.log(`📁 Archivos estáticos: /uploads`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("\n📝 Comandos disponibles:");
      console.log("   npm start          - Iniciar servidor");
      console.log("   npm run dev        - Modo desarrollo con nodemon");
      console.log("   npm run sync       - Sincronizar estudiantes desde API");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    });
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error);
    process.exit(1);
  }
};

iniciarServidor();