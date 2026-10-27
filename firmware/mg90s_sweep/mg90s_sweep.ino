/*
 * MG90S 서보 5도씩 왕복 (0° → 180° → 0° 반복)
 * 배선: 주황(신호) → D9, 빨강(VCC) → 5V, 갈색(GND) → GND
 */
#include <Servo.h>

const int SERVO_PIN = 9;
const int STEP      = 5;    // 한 번에 움직일 각도
const int MIN_ANGLE = 0;
const int MAX_ANGLE = 180;
const int DELAY_MS  = 100;  // 한 스텝마다 멈추는 시간 (작게 하면 빨라짐)

Servo servo;
int angle = MIN_ANGLE;
int dir   = +1;             // +1: 증가, -1: 감소

void setup() {
  Serial.begin(9600);
  servo.attach(SERVO_PIN);
  servo.write(angle);
  delay(500);
}

void loop() {
  servo.write(angle);
  Serial.println(angle);

  angle += STEP * dir;
  if (angle >= MAX_ANGLE) { angle = MAX_ANGLE; dir = -1; }
  if (angle <= MIN_ANGLE) { angle = MIN_ANGLE; dir = +1; }

  delay(DELAY_MS);
}
