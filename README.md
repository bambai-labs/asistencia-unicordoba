# Sistema de Asistencia - Unicordoba

Sistema de gestión de asistencia a eventos con ESP32, React y Node.js.

## 🚀 Despliegue con Docker

### Prerrequisitos

- Docker y Docker Compose instalados
- Dominios configurados:
  - `asistencia-unicor.bambai.dev` → Frontend
  - `asistencia-unicor-api.bambai.dev` → Backend

### Configuración

1. **Crear variables de entorno**

Backend (`server/.env`):

```env
PORT=3000
NODE_ENV=production
SERVER_URL=https://asistencia-unicor-api.bambai.dev
MONGODB_URI=mongodb://mongodb:27017/asistencia_unicordoba
JWT_SECRET=tu_secreto_super_seguro_aqui
```

Frontend (`client/.env`):

```env
VITE_API_URL=https://asistencia-unicor-api.bambai.dev/api
```

2. **Generar JWT_SECRET seguro**

```bash
openssl rand -base64 64
```

### Iniciar Servicios

```bash
docker-compose up -d
```

Servicios disponibles:

- Frontend: `http://localhost:8081`
- Backend: `http://localhost:3100`
- MongoDB: Interno (no expuesto)

### Comandos Útiles

```bash
# Ver estado
docker-compose ps

# Ver logs
docker-compose logs -f

# Reiniciar
docker-compose restart

# Detener
docker-compose down

# Sincronizar estudiantes
docker-compose exec backend npm run sync

# Backup MongoDB
docker exec asistencia-mongodb mongodump --db=asistencia_unicordoba --out=/backup
```

## 🌐 Configuración de Nginx (Reverse Proxy)

### Frontend

```nginx
server {
    listen 80;
    server_name asistencia-unicor.bambai.dev;

    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Backend

```nginx
server {
    listen 80;
    server_name asistencia-unicor-api.bambai.dev;
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Obtener SSL

```bash
certbot --nginx -d asistencia-unicor.bambai.dev
certbot --nginx -d asistencia-unicor-api.bambai.dev
```

## 📦 Estructura

```
├── docker-compose.yml          # Orquestación de servicios
├── server/
│   ├── Dockerfile             # Imagen del backend
│   ├── .env                   # Variables de entorno
│   └── ...
└── client/
    ├── Dockerfile             # Imagen del frontend
    ├── nginx.conf             # Configuración de Nginx
    ├── .env                   # Variables de entorno
    └── ...
```

## 💾 Persistencia

Los datos se guardan en volúmenes Docker:

- `asistencia_mongodb_data` - Base de datos
- `asistencia_uploads_data` - Archivos subidos

Los datos persisten incluso al reiniciar o actualizar contenedores.

## 📱 ESP32-CAM (Dispositivo IoT)

El proyecto incluye código para ESP32-CAM que escanea códigos QR y registra asistencia automáticamente.

### Configuración del ESP32

1. **Abrir código**: `esp/esp.ino` en Arduino IDE

2. **Configurar WiFi**:

```cpp
const char* ssid = "TU_RED_WIFI";
const char* password = "TU_CONTRASEÑA_WIFI";
```

3. **Configurar código del dispositivo**:

```cpp
const char* dispositivo_codigo = "ESP001"; // Cambiar por ESP002, ESP003, etc.
```

4. **La URL ya está configurada** para producción:

```cpp
const char* serverUrl = "https://asistencia-unicor-api.bambai.dev/api/asistencia/registrar";
```

### Requisitos

- Arduino IDE con soporte para ESP32
- ESP32-CAM (AI-Thinker)
- Programador FTDI
- Librería quirc (incluida)

### Uso

1. Registrar el dispositivo en el sistema web (código: ESP001, ESP002, etc.)
2. Crear un evento y asignarle el dispositivo
3. Subir el código al ESP32-CAM
4. El dispositivo escaneará códigos QR automáticamente
5. El LED indicará el estado (detectado, enviando, error)

Ver documentación completa en: `esp/README.md`
