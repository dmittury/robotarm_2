/*
 * ESP32 로봇암 펌웨어 예제
 *  - 5개 서보를 ESP32Servo 라이브러리로 제어
 *  - 1초마다 현재 각도를 /api/telemetry 로 POST
 *  - 2초마다 /api/commands 를 폴링해서 pending 명령 실행 후 PATCH 로 done 보고
 *
 * 라이브러리: ESP32Servo, ArduinoJson (라이브러리 매니저에서 설치)
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASS = "YOUR_PASSWORD";
const char* BASE_URL  = "https://your-app.vercel.app";   // Vercel 배포 주소
const char* ROBOT_KEY = "change-me-to-a-long-random-string"; // .env의 ROBOT_API_KEY 와 동일

const int NUM_SERVOS = 5;
const int SERVO_PINS[NUM_SERVOS] = {13, 12, 14, 27, 26};
Servo servos[NUM_SERVOS];
float currentAngle[NUM_SERVOS] = {90, 90, 90, 90, 90};
float targetAngle[NUM_SERVOS]  = {90, 90, 90, 90, 90};
float speedFactor[NUM_SERVOS]  = {1, 1, 1, 1, 1};

unsigned long lastTelemetry = 0, lastPoll = 0, lastStep = 0;

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < NUM_SERVOS; i++) { servos[i].attach(SERVO_PINS[i]); servos[i].write(90); }
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nWiFi OK");
}

void loop() {
  unsigned long now = millis();

  // 부드러운 이동 (20ms마다 한 스텝)
  if (now - lastStep >= 20) {
    lastStep = now;
    for (int i = 0; i < NUM_SERVOS; i++) {
      float diff = targetAngle[i] - currentAngle[i];
      float step = 2.0f * speedFactor[i];              // deg / 20ms
      if (fabs(diff) <= step) currentAngle[i] = targetAngle[i];
      else currentAngle[i] += (diff > 0 ? step : -step);
      servos[i].write((int)currentAngle[i]);
    }
  }

  if (now - lastTelemetry >= 1000) { lastTelemetry = now; sendTelemetry(); }
  if (now - lastPoll >= 2000)      { lastPoll = now; pollCommands(); }
}

void sendTelemetry() {
  StaticJsonDocument<768> doc;
  JsonArray arr = doc.createNestedArray("readings");
  for (int i = 0; i < NUM_SERVOS; i++) {
    JsonObject r = arr.createNestedObject();
    r["servo_id"] = i;
    r["angle"]    = currentAngle[i];
    r["target"]   = targetAngle[i];
    // r["current_ma"] = readCurrent(i);  // INA219 등 센서가 있으면 추가
  }
  String body; serializeJson(doc, body);

  HTTPClient http;
  http.begin(String(BASE_URL) + "/api/telemetry");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-robot-key", ROBOT_KEY);
  int code = http.POST(body);
  Serial.printf("telemetry %d\n", code);
  http.end();
}

void pollCommands() {
  HTTPClient http;
  http.begin(String(BASE_URL) + "/api/commands?status=pending");
  http.addHeader("x-robot-key", ROBOT_KEY);
  int code = http.GET();
  if (code == 200) {
    StaticJsonDocument<2048> doc;
    if (!deserializeJson(doc, http.getString())) {
      for (JsonObject c : doc["commands"].as<JsonArray>()) {
        int id = c["servo_id"]; float t = c["target"]; float s = c["speed"] | 1.0f;
        if (id >= 0 && id < NUM_SERVOS) {
          targetAngle[id] = constrain(t, 0, 180);
          speedFactor[id] = constrain(s, 0.1f, 1.0f);
          ackCommand(c["id"], "done");
        } else ackCommand(c["id"], "failed");
      }
    }
  }
  http.end();
}

void ackCommand(long id, const char* status) {
  HTTPClient http;
  http.begin(String(BASE_URL) + "/api/commands");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-robot-key", ROBOT_KEY);
  String body = "{\"id\":" + String(id) + ",\"status\":\"" + status + "\"}";
  http.PATCH(body);
  http.end();
}
