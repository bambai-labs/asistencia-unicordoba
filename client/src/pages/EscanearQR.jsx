import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Stack,
  Title,
  Button,
  Select,
  Text,
  Card,
  Center,
  Loader,
  Group,
  Badge,
  Alert,
  Paper,
  Box
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconQrcode, IconArrowLeft, IconCheck, IconAlertTriangle, IconCamera, IconMapPin, IconClock, IconCalendar } from '@tabler/icons-react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { asistenciaService } from '../services/api'
import dayjs from 'dayjs'

const EscanearQR = () => {
  const navigate = useNavigate()
  const [eventos, setEventos] = useState([])
  const [eventoSeleccionado, setEventoSeleccionado] = useState('')
  const [loading, setLoading] = useState(true)
  const [escaneando, setEscaneando] = useState(false)
  const [ultimoEscaneado, setUltimoEscaneado] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const scannerRef = useRef(null)
  const qrScannerRef = useRef(null)

  useEffect(() => {
    loadEventos()
  }, [])

  useEffect(() => {
    return () => {
      // Limpiar scanner al desmontar
      if (qrScannerRef.current) {
        qrScannerRef.current.clear().catch(console.error)
      }
    }
  }, [])

  const loadEventos = async () => {
    try {
      setLoading(true)
      const data = await asistenciaService.getEventosActivos()
      setEventos(data.eventos || [])
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar los eventos',
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  const iniciarEscaneo = async () => {
    if (!eventoSeleccionado) {
      notifications.show({
        title: 'Atención',
        message: 'Debes seleccionar un evento primero',
        color: 'yellow'
      })
      return
    }

    try {
      // Verificar si estamos en un contexto seguro
      const isSecureContext = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost'
      
      if (!isSecureContext) {
        notifications.show({
          title: 'Conexión No Segura',
          message: 'Para usar la cámara en móviles, debes acceder mediante HTTPS. En computadoras funciona con HTTP.',
          color: 'orange',
          autoClose: 8000
        })
      }
      
      setEscaneando(true)
      
      // Pequeña pausa para que React actualice el DOM
      setTimeout(() => {
        try {
          // Configurar el scanner - este manejará los permisos de cámara
          const scanner = new Html5QrcodeScanner('qr-reader', {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.777778,
            showTorchButtonIfSupported: true,
            formatsToSupport: [0],
            videoConstraints: {
              facingMode: 'environment'
            }
          }, /* verbose= */ false)

          qrScannerRef.current = scanner
          
          // Manejar errores del scanner
          scanner.render(onScanSuccess, (errorMessage) => {
            // Solo mostrar errores críticos
            if (errorMessage && !errorMessage.includes('NotFoundException')) {
              console.log('Scanner error:', errorMessage)
            }
          })
        } catch (error) {
          console.error('Error al inicializar scanner:', error)
          handleCameraError(error)
          setEscaneando(false)
        }
      }, 100)
    } catch (error) {
      console.error('Error al iniciar escaneo:', error)
      handleCameraError(error)
      setEscaneando(false)
    }
  }

  const handleCameraError = (error) => {
    let errorMessage = 'No se pudo acceder a la cámara. '
    
    if (error.name === 'NotAllowedError') {
      errorMessage = 'Debes permitir el acceso a la cámara en la configuración del navegador.'
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No se encontró ninguna cámara en el dispositivo.'
    } else if (error.name === 'NotSupportedError' || error.name === 'TypeError') {
      errorMessage = 'Para usar la cámara en móviles debes acceder mediante HTTPS (https://). Contacta al administrador.'
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'La cámara está siendo usada por otra aplicación. Cierra otras apps que usen la cámara e intenta nuevamente.'
    }
    
    notifications.show({
      title: 'Error de Cámara',
      message: errorMessage,
      color: 'red',
      autoClose: 8000
    })
  }

  const detenerEscaneo = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.clear().catch(console.error)
      qrScannerRef.current = null
    }
    setEscaneando(false)
  }

  const onScanSuccess = async (decodedText) => {
    // Evitar escaneos múltiples mientras se procesa uno
    if (procesando) {
      return
    }

    try {
      setProcesando(true)
      
      // El código QR debe ser el código del carnet del estudiante
      const codigoCarnet = decodedText.trim()

      // Registrar asistencia
      const response = await asistenciaService.registrarQR({
        evento_id: eventoSeleccionado,
        codigo_carnet: codigoCarnet
      })

      if (response.success) {
        setUltimoEscaneado({
          success: true,
          estudiante: response.estudiante,
          fecha: new Date()
        })

        // Auto-limpiar el mensaje después de 4 segundos
        if (window.scanTimeoutId) clearTimeout(window.scanTimeoutId)
        window.scanTimeoutId = setTimeout(() => {
          setUltimoEscaneado(null)
        }, 4000)

        // Vibración de éxito en móviles
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100])
        }

        // Reproducir sonido de "pip" de éxito
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)()
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          
          oscillator.frequency.value = 800 // Frecuencia del pip
          oscillator.type = 'sine'
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15)
          
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.15)
        } catch (e) {
          console.log('No se pudo reproducir el sonido')
        }

        // Esperar 2 segundos antes de permitir otro escaneo
        setTimeout(() => {
          setProcesando(false)
        }, 2000)
      } else {
        setProcesando(false)
      }
    } catch (error) {
      setProcesando(false)
      setUltimoEscaneado({
        success: false,
        mensaje: error.message || 'Error al registrar asistencia',
        fecha: new Date()
      })

      // Auto-limpiar el mensaje después de 4 segundos
      if (window.scanTimeoutId) clearTimeout(window.scanTimeoutId)
      window.scanTimeoutId = setTimeout(() => {
        setUltimoEscaneado(null)
      }, 4000)

      // Vibración de error en móviles
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200])
      }
    }
  }

  const onScanError = (errorMessage) => {
    // Solo mostrar errores críticos, no errores de "no se encontró QR"
    // NotFoundException es normal cuando no hay QR visible
    if (errorMessage && !errorMessage.includes('NotFoundException')) {
      console.log('Scan error:', errorMessage)
    }
  }

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="green" size="xl" />
      </Center>
    )
  }

  const eventosOptions = eventos.map(e => ({
    value: e._id,
    label: `${e.nombre} - ${dayjs(e.fecha).format('DD/MM/YYYY')}`
  }))

  const eventoActual = eventos.find(e => e._id === eventoSeleccionado)

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={1} c="green.7">
            Escanear QR
          </Title>
          <Text c="dimmed" size="sm">
            Escanea el código QR del carnet del estudiante
          </Text>
        </div>
        <Button
          leftSection={<IconArrowLeft size={16} />}
          variant="light"
          onClick={() => navigate('/asistencias')}
        >
          Volver
        </Button>
      </Group>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Select
            label="Seleccionar Evento"
            placeholder="Elige un evento activo"
            data={eventosOptions}
            value={eventoSeleccionado}
            onChange={setEventoSeleccionado}
            leftSection={<IconQrcode size={16} />}
            searchable
            required
            disabled={escaneando}
          />

          {eventoActual && (
            <Paper p="md" withBorder bg="gray.0">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>Evento seleccionado:</Text>
                  <Badge color="green">{eventoActual.periodo}</Badge>
                </Group>
                <Text size="lg" fw={600} c="green.7">{eventoActual.nombre}</Text>
                <Group gap="lg">
                  <Group gap="xs">
                    <IconCalendar size={16} />
                    <Text size="sm" c="dimmed">
                      {dayjs(eventoActual.fecha).format('DD/MM/YYYY')}
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <IconClock size={16} />
                    <Text size="sm" c="dimmed">
                      {eventoActual.hora_inicio} - {eventoActual.hora_fin}
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <IconMapPin size={16} />
                    <Text size="sm" c="dimmed">
                      {eventoActual.lugar}
                    </Text>
                  </Group>
                </Group>
              </Stack>
            </Paper>
          )}

          {!escaneando ? (
            <Button
              leftSection={<IconCamera size={20} />}
              onClick={iniciarEscaneo}
              disabled={!eventoSeleccionado}
              color="green"
              size="lg"
              fullWidth
            >
              Iniciar Escaneo
            </Button>
          ) : (
            <Button
              onClick={detenerEscaneo}
              color="red"
              size="lg"
              fullWidth
            >
              Detener Escaneo
            </Button>
          )}
        </Stack>
      </Card>

      {escaneando && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={600}>Cámara Activa</Text>
              <Badge color="green" variant="dot" size="lg">Escaneando...</Badge>
            </Group>

            <Alert color="blue" variant="light">
              <Text size="sm" fw={500}>
                Coloca el código QR del carnet dentro del recuadro
              </Text>
            </Alert>

            <Box
              id="qr-reader"
              style={{
                width: '100%',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            />

            <style>{`
              #qr-reader {
                border: 2px solid var(--mantine-color-green-6);
                border-radius: 8px;
              }
              #qr-reader video {
                border-radius: 8px !important;
                width: 100% !important;
                height: auto !important;
                display: block !important;
              }
              #qr-reader__dashboard {
                padding: 10px !important;
              }
              #qr-reader__dashboard_section_csr {
                text-align: center;
              }
              #qr-reader__camera_selection {
                width: 100%;
                max-width: 100%;
                padding: 5px;
              }
              #qr-reader__scan_region {
                border-radius: 8px;
              }
              #qr-reader__scan_region video {
                object-fit: cover;
              }
            `}</style>
          </Stack>
        </Card>
      )}

      {ultimoEscaneado && (
        <Alert
          icon={ultimoEscaneado.success ? <IconCheck size={16} /> : <IconAlertTriangle size={16} />}
          color={ultimoEscaneado.success ? 'green' : 'red'}
          title={ultimoEscaneado.success ? 'Asistencia Registrada' : 'Error al Registrar'}
          withCloseButton
          onClose={() => setUltimoEscaneado(null)}
        >
          {ultimoEscaneado.success ? (
            <Stack gap="xs">
              <Text fw={600}>{ultimoEscaneado.estudiante.nombre}</Text>
              <Group gap="md">
                <Text size="sm">Carnet: {ultimoEscaneado.estudiante.codigo}</Text>
                <Text size="sm">CC: {ultimoEscaneado.estudiante.identificacion}</Text>
              </Group>
              <Text size="xs" c="dimmed">
                {dayjs(ultimoEscaneado.fecha).format('HH:mm:ss')}
              </Text>
            </Stack>
          ) : (
            <Text>{ultimoEscaneado.mensaje}</Text>
          )}
        </Alert>
      )}

      {eventos.length === 0 && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Center h={200}>
            <Stack align="center" gap="md">
              <IconQrcode size={48} stroke={1.5} color="gray" />
              <Text c="dimmed" ta="center">No hay eventos activos para tomar asistencia</Text>
            </Stack>
          </Center>
        </Card>
      )}
    </Stack>
  )
}

export default EscanearQR

