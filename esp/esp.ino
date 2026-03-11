//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> 01 ESP32 Cam QR Code Scanner
/*
 * Reference :
 * - ESP32-CAM QR Code Reader (off-line) : https://www.youtube.com/watch?v=ULZL37YqJc8
 * - ESP32QRCodeReader_Page : https://github.com/fustyles/Arduino/tree/master/ESP32-CAM_QRCode_Recognition/ESP32QRCodeReader_Page
 * 
 * The source of the "quirc" library I shared on this project: https://github.com/fustyles/Arduino/tree/master/ESP32-CAM_QRCode_Recognition/ESP32QRCodeReader_Page
 */

/* ======================================== Including the libraries. */
#include "esp_camera.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include "quirc.h"
#include <WiFi.h>
#include <HTTPClient.h>
/* ======================================== */

/* ======================================== WiFi credentials */
const char* ssid = "INTERNET";           // Cambia por tu red WiFi
const char* password = "123456789"; // Cambia por tu contraseña WiFi
const char* serverUrl = "https://asistencia-unicor-api.bambai.dev/api/asistencia/registrar"; // URL de producción
const char* dispositivo_codigo = "ESP001";   // Código único del dispositivo (cambiar según el dispositivo)
/* ======================================== */

/* ======================================== LED Pin */
#define LED_PIN 4  // GPIO 4 - LED Flash del ESP32-CAM
/* ======================================== */

TaskHandle_t QRCodeReader_Task; 

/* ======================================== Select camera model */
//#define CAMERA_MODEL_WROVER_KIT
//#define CAMERA_MODEL_ESP_EYE
//#define CAMERA_MODEL_M5STACK_PSRAM
//#define CAMERA_MODEL_M5STACK_WITHOUT_PSRAM
//#define CAMERA_MODEL_M5STACK_WITHOUT_PSRAM
#define CAMERA_MODEL_AI_THINKER
/* ======================================== */

/* ======================================== GPIO of camera models */
#if defined(CAMERA_MODEL_WROVER_KIT)
  #define PWDN_GPIO_NUM    -1
  #define RESET_GPIO_NUM   -1
  #define XCLK_GPIO_NUM    21
  #define SIOD_GPIO_NUM    26
  #define SIOC_GPIO_NUM    27
  
  #define Y9_GPIO_NUM      35
  #define Y8_GPIO_NUM      34
  #define Y7_GPIO_NUM      39
  #define Y6_GPIO_NUM      36
  #define Y5_GPIO_NUM      19
  #define Y4_GPIO_NUM      18
  #define Y3_GPIO_NUM       5
  #define Y2_GPIO_NUM       4
  #define VSYNC_GPIO_NUM   25
  #define HREF_GPIO_NUM    23
  #define PCLK_GPIO_NUM    22

#elif defined(CAMERA_MODEL_ESP_EYE)
  #define PWDN_GPIO_NUM    -1
  #define RESET_GPIO_NUM   -1
  #define XCLK_GPIO_NUM    4
  #define SIOD_GPIO_NUM    18
  #define SIOC_GPIO_NUM    23
  
  #define Y9_GPIO_NUM      36
  #define Y8_GPIO_NUM      37
  #define Y7_GPIO_NUM      38
  #define Y6_GPIO_NUM      39
  #define Y5_GPIO_NUM      35
  #define Y4_GPIO_NUM      14
  #define Y3_GPIO_NUM      13
  #define Y2_GPIO_NUM      34
  #define VSYNC_GPIO_NUM   5
  #define HREF_GPIO_NUM    27
  #define PCLK_GPIO_NUM    25

#elif defined(CAMERA_MODEL_M5STACK_PSRAM)
  #define PWDN_GPIO_NUM     -1
  #define RESET_GPIO_NUM    15
  #define XCLK_GPIO_NUM     27
  #define SIOD_GPIO_NUM     25
  #define SIOC_GPIO_NUM     23
  
  #define Y9_GPIO_NUM       19
  #define Y8_GPIO_NUM       36
  #define Y7_GPIO_NUM       18
  #define Y6_GPIO_NUM       39
  #define Y5_GPIO_NUM        5
  #define Y4_GPIO_NUM       34
  #define Y3_GPIO_NUM       35
  #define Y2_GPIO_NUM       32
  #define VSYNC_GPIO_NUM    22
  #define HREF_GPIO_NUM     26
  #define PCLK_GPIO_NUM     21

#elif defined(CAMERA_MODEL_M5STACK_WITHOUT_PSRAM)
  #define PWDN_GPIO_NUM     -1
  #define RESET_GPIO_NUM    15
  #define XCLK_GPIO_NUM     27
  #define SIOD_GPIO_NUM     25
  #define SIOC_GPIO_NUM     23
  
  #define Y9_GPIO_NUM       19
  #define Y8_GPIO_NUM       36
  #define Y7_GPIO_NUM       18
  #define Y6_GPIO_NUM       39
  #define Y5_GPIO_NUM        5
  #define Y4_GPIO_NUM       34
  #define Y3_GPIO_NUM       35
  #define Y2_GPIO_NUM       17
  #define VSYNC_GPIO_NUM    22
  #define HREF_GPIO_NUM     26
  #define PCLK_GPIO_NUM     21

#elif defined(CAMERA_MODEL_AI_THINKER)
  #define PWDN_GPIO_NUM     32
  #define RESET_GPIO_NUM    -1
  #define XCLK_GPIO_NUM      0
  #define SIOD_GPIO_NUM     26
  #define SIOC_GPIO_NUM     27
  
  #define Y9_GPIO_NUM       35
  #define Y8_GPIO_NUM       34
  #define Y7_GPIO_NUM       39
  #define Y6_GPIO_NUM       36
  #define Y5_GPIO_NUM       21
  #define Y4_GPIO_NUM       19
  #define Y3_GPIO_NUM       18
  #define Y2_GPIO_NUM        5
  #define VSYNC_GPIO_NUM    25
  #define HREF_GPIO_NUM     23
  #define PCLK_GPIO_NUM     22
#else
  #error "Camera model not selected"
#endif
/* ======================================== */

/* ======================================== Variables declaration */
struct QRCodeData
{
  bool valid;
  int dataType;
  uint8_t payload[1024];
  int payloadLen;
};

// struct quirc *q = NULL;  // << CAMBIO: No inicializar aquí
// uint8_t *image = NULL;   // << CAMBIO: No inicializar aquí
camera_fb_t * fb = NULL;
struct quirc_code code;
struct quirc_data data;
quirc_decode_error_t err;
struct QRCodeData qrCodeData;  
String QRCodeResult = "";
/* ======================================== */

/* ________________________________________________________________________________ VOID SETTUP() */
void setup() {
  // put your setup code here, to run once:

  // Disable brownout detector.
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  /* ---------------------------------------- Init serial communication speed (baud rate). */
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println();
  /* ---------------------------------------- */

  /* ---------------------------------------- Camera configuration. */
  Serial.println("Start configuring and initializing the camera...");
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 10000000;
  config.pixel_format = PIXFORMAT_GRAYSCALE;
  config.frame_size = FRAMESIZE_QVGA;
  config.jpeg_quality = 15;
  config.fb_count = 1;
  
  #if defined(CAMERA_MODEL_ESP_EYE)
    pinMode(13, INPUT_PULLUP);
    pinMode(14, INPUT_PULLUP);
  #endif

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    ESP.restart();
  }
  
  sensor_t * s = esp_camera_sensor_get();
  // Configuración inicial de QVGA ya hecha en config.
  
  // << CAMBIOS: Ajustar sensor para mejor contraste y brillo
  // s->set_brightness(s, 1);     // -2 a 2
  s->set_contrast(s, 1);       // -2 a 2
  s->set_framesize(s, FRAMESIZE_QVGA);
  
  Serial.println("Configure and initialize the camera successfully.");
  Serial.println();
  /* ---------------------------------------- */

  /* ---------------------------------------- LED configuration */
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // Asegurar que el LED esté apagado al inicio
  Serial.println("LED configured on GPIO 4");
  /* ---------------------------------------- */

  /* ---------------------------------------- WiFi connection */
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected successfully!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("WiFi connection failed. Continuing without network...");
  }
  Serial.println();
  /* ---------------------------------------- */

  /* ---------------------------------------- create "QRCodeReader_Task" using the xTaskCreatePinnedToCore() function */
  xTaskCreatePinnedToCore(
             QRCodeReader,          /* Task function. */
             "QRCodeReader_Task",   /* name of task. */
             10000,                 /* Stack size of task */
             NULL,                  /* parameter of the task */
             2,                     /* << CAMBIO: Prioridad 1 a 2 (más alta que el loop) */
             &QRCodeReader_Task,    /* Task handle to keep track of created task */
             0);                    /* pin task to core 0 */
  /* ---------------------------------------- */
}
/* ________________________________________________________________________________ */
void loop() {
  // put your main code here, to run repeatedly:
  delay(1000); // El núcleo 1 (loop) puede dormir, el núcleo 0 hará el trabajo.
}
/* ________________________________________________________________________________ */

/* ________________________________________________________________________________ The function to be executed by "QRCodeReader_Task" */
// This function is to instruct the camera to take or capture a QR Code image, then it is processed and translated into text.
void QRCodeReader( void * pvParameters ){
  /* ---------------------------------------- */
  Serial.println("QRCodeReader is ready.");
  Serial.print("QRCodeReader running on core ");
  Serial.println(xPortGetCoreID());
  Serial.println();
  /* ---------------------------------------- */

  // << CAMBIO: Crear el objeto quirc UNA SOLA VEZ
  struct quirc *q;
  q = quirc_new();
  if (q == NULL) {
    Serial.println("Failed to create quirc object. Halting task.");
    vTaskDelete(NULL); // Eliminar esta tarea
    return;
  }

  /* ---------------------------------------- Loop to read QR Code in real time. */
  while(1){
    // << CAMBIO: NO crear 'q' aquí dentro
    
    fb = esp_camera_fb_get();
    if (!fb)
    {
      Serial.println("Camera capture failed");
      // No continuar si la captura falló
      continue; 
    }   
    
    // << CAMBIO: Redimensionar el objeto quirc si el tamaño del fotograma es inesperado
    // (Aunque con QVGA debería ser siempre 320x240)
    if (quirc_resize(q, fb->width, fb->height) < 0) {
      Serial.println("Failed to resize quirc. Skipping frame.");
      esp_camera_fb_return(fb);
      continue;
    }

    // << CAMBIO: Usar quirc_begin para obtener el búfer y copiar en él
    uint8_t *image = quirc_begin(q, NULL, NULL);
    memcpy(image, fb->buf, fb->len);
    quirc_end(q);
    
    int count = quirc_count(q);
    if (count > 0) {
      quirc_extract(q, 0, &code); // Extraer solo el primer QR encontrado
      err = quirc_decode(&code, &data);
    
      if (err){
        Serial.println("Decoding FAILED");
        QRCodeResult = "Decoding FAILED";
      } else {
        Serial.printf("Decoding successful:\n");
        dumpData(&data);
      } 
      Serial.println();
    } 
    // << CAMBIO: Si count es 0, no imprimimos NADA.
    // Esto evita que el log se llene de "FAILED" cuando no hay un QR.
    // Solo imprimirá "FAILED" si VE un QR pero no puede decodificarlo.
    
    esp_camera_fb_return(fb);
    fb = NULL;
    // image = NULL; // No es necesario, 'image' es un puntero local
    
    // << CAMBIO: NO destruir 'q' aquí
    
    // Pequeña pausa para no acaparar la CPU al 100% y dar tiempo a otras tareas
    vTaskDelay(10 / portTICK_PERIOD_MS); 
  }
  /* ---------------------------------------- */
  
  // << CAMBIO: Limpieza si el bucle se rompiera (nunca pasa aquí, pero es buena práctica)
  Serial.println("QRCodeReader task finishing.");
  quirc_destroy(q);
  vTaskDelete(NULL);
}
/* ________________________________________________________________________________ */

/* ________________________________________________________________________________ Function to send QR payload to server via POST */
void sendQRToServer(const char* payload) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    
    // Crear JSON con el payload y dispositivo_codigo
    String jsonData = "{\"payload\":\"" + String(payload) + "\",\"dispositivo_codigo\":\"" + String(dispositivo_codigo) + "\"}";
    
    Serial.println("Sending POST request to server...");
    Serial.println("JSON: " + jsonData);
    
    int httpResponseCode = http.POST(jsonData);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.printf("HTTP Response code: %d\n", httpResponseCode);
      Serial.println("Response: " + response);
      
      // Si el POST fue exitoso (código 200-299), no hacer nada con el LED
      if (httpResponseCode >= 200 && httpResponseCode < 300) {
        Serial.println("Asistencia registrada exitosamente - OK");
      } else {
        // Si hubo error, parpadear LED 2 veces
        Serial.println("Error en registro - LED parpadeando");
        for (int i = 0; i < 2; i++) {
          digitalWrite(LED_PIN, HIGH);
          delay(200);
          digitalWrite(LED_PIN, LOW);
          delay(200);
        }
      }
    } else {
      Serial.printf("Error on sending POST: %d\n", httpResponseCode);
      // Parpadear LED 2 veces en caso de error
      Serial.println("Error de conexión - LED parpadeando");
      for (int i = 0; i < 2; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(200);
        digitalWrite(LED_PIN, LOW);
        delay(200);
      }
    }
    
    http.end();
  } else {
    Serial.println("WiFi not connected. Cannot send data.");
    // Parpadear LED 2 veces si no hay WiFi
    Serial.println("Sin WiFi - LED parpadeando");
    for (int i = 0; i < 2; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(200);
      digitalWrite(LED_PIN, LOW);
      delay(200);
    }
  }
}
/* ________________________________________________________________________________ */

/* ________________________________________________________________________________ Function to display the results of reading the QR Code on the serial monitor. */
void dumpData(const struct quirc_data *data)
{
  Serial.printf("Version: %d\n", data->version);
  Serial.printf("ECC level: %c\n", "MLHQ"[data->ecc_level]);
  Serial.printf("Mask: %d\n", data->mask);
  Serial.printf("Length: %d\n", data->payload_len);
  Serial.printf("Payload: %s\n", data->payload);
  
  QRCodeResult = (const char *)data->payload;
  
  // Encender LED brevemente para indicar QR detectado
  digitalWrite(LED_PIN, HIGH);
  Serial.println("LED encendido - QR detectado");
  delay(500);  // Mantener encendido 0.5 segundos
  
  // Apagar LED antes de enviar
  digitalWrite(LED_PIN, LOW);
  Serial.println("LED apagado - Enviando datos...");
  
  // Enviar el payload al servidor
  sendQRToServer((const char *)data->payload);
}
/* ________________________________________________________________________________ */
//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
