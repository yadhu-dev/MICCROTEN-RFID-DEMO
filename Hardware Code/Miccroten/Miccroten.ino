#include <SPI.h>
#include <MFRC522.h>

#define SDA 10
#define RST 9
#define Led 5
#define Buzzer 3

MFRC522 rfid(SDA, RST);

String incomingCmd = "";
bool readingActive = false;
bool uidReadingActive = false;  // separate flag for UID mode
bool writingActive = false;     // persistent write mode
byte activeBlock = 0;

void setup() {
  Serial.begin(115200);
  SPI.begin();
  rfid.PCD_Init();
  pinMode(Led, OUTPUT);
  pinMode(Buzzer, OUTPUT);
  Serial.println("RFID ready...");
}

void loop() {
  // ----- Handle incoming serial commands -----
  if (Serial.available()) {
    incomingCmd = Serial.readStringUntil('\n');
    incomingCmd.trim();

    if (incomingCmd == "_") {
      Serial.println("__");  // heartbeat
      // Serial.flush();
    } else if (incomingCmd.startsWith("-&")) {
      activeBlock = incomingCmd.substring(2).toInt();
      readingActive = true;
      uidReadingActive = false;
      writingActive = false;
      Serial.print("Reading started for block: ");
      Serial.println(activeBlock);
    } else if (incomingCmd == ";") {
      readingActive = false;
      uidReadingActive = false;
      writingActive = false;
      Serial.println("Reading/Writing stopped");
    } else if (incomingCmd == "*") {
      uidReadingActive = true;
      readingActive = false;
      writingActive = false;
      Serial.println("UID Reading Started...");
    } else if (incomingCmd.startsWith("@&")) {
      activeBlock = incomingCmd.substring(2).toInt();
      writingActive = true;  // persistent write mode
      readingActive = false;
      uidReadingActive = false;
      Serial.print("Persistent Write mode activated for block: ");
      Serial.println(activeBlock);
    } else if (incomingCmd == "_stopwrite_") {  // <-- NEW: stop persistent write
      writingActive = false;
      Serial.println("Persistent Write mode stopped");
    }
  }

  // ----- Block reading mode -----
  if (readingActive) readRFIDBlock(activeBlock);

  // ----- UID reading mode -----
  if (uidReadingActive) readRFIDUID();

  // ----- Persistent Write mode -----
  if (writingActive) {
    writeRFIDBlock(activeBlock);
  }
}

// ----- Read and send UID -----
void readRFIDUID() {
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    String uidStr = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
      if (rfid.uid.uidByte[i] < 0x10) uidStr += "0";
      uidStr += String(rfid.uid.uidByte[i], HEX);
      if (i != rfid.uid.size - 1) uidStr += ":";
    }
    uidStr.toUpperCase();

    Serial.print("<");
    Serial.print(uidStr);
    Serial.println(">");

    digitalWrite(Led, HIGH);
    digitalWrite(Buzzer, HIGH);
    delay(50);
    digitalWrite(Led, LOW);
    digitalWrite(Buzzer, LOW);

    delay(300);  // prevent duplicate UID reads

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
  }
}

// ----- Read specific block -----
void readRFIDBlock(byte blockAddr) {
  MFRC522::MIFARE_Key key;
  for (byte i = 0; i < 6; i++) key.keyByte[i] = 0xFF;

  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    byte buffer[18] = { 0 };
    byte size = sizeof(buffer);
    MFRC522::StatusCode status;

    status = rfid.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, blockAddr, &key, &(rfid.uid));
    if (status != MFRC522::STATUS_OK) {
      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();
      return;
    }

    status = rfid.MIFARE_Read(blockAddr, buffer, &size);
    if (status == MFRC522::STATUS_OK) {
      String readData = "";
      for (byte i = 0; i < 16; i++) {
        if (buffer[i] == '#' || buffer[i] == '$') break;
        if (buffer[i] >= 32 && buffer[i] <= 126) {
          readData += (char)buffer[i];
        }
      }

      if (readData.length() > 0) {
        Serial.print("<");
        Serial.print(readData);
        Serial.println(">");
      }
    }

    digitalWrite(Led, HIGH);
    digitalWrite(Buzzer, HIGH);
    delay(50);
    digitalWrite(Led, LOW);
    digitalWrite(Buzzer, LOW);

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
  }
}

// ----- Write to specific block with dynamic data -----
void writeRFIDBlock(byte blockAddr) {

  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    digitalWrite(Led, LOW);
    return;
  }

  digitalWrite(Led, HIGH);

  MFRC522::MIFARE_Key key;
  for (byte i = 0; i < 6; i++) key.keyByte[i] = 0xFF;

  if (Serial.available() > 0) {
    String user_data = Serial.readStringUntil('\n');
    user_data.trim();  // remove trailing newlines/spaces

    byte dataBlock[16] = { 0 };  // initialize all to 0

    // Copy up to 16 bytes from the string
    for (byte i = 0; i < 16 && i < user_data.length(); i++) {
      dataBlock[i] = user_data[i];
    }

    // Authenticate
    MFRC522::StatusCode status = rfid.PCD_Authenticate(
      MFRC522::PICC_CMD_MF_AUTH_KEY_A, blockAddr, &key, &(rfid.uid));
    if (status != MFRC522::STATUS_OK) {
      Serial.println("Auth failed");
      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();
      return;
    }

    // Write data
    status = rfid.MIFARE_Write(blockAddr, dataBlock, 16);
    if (status == MFRC522::STATUS_OK) {
      Serial.print("Write success on block ");
      Serial.println(blockAddr);
    } else {
      Serial.print("Write failed on block ");
      Serial.println(blockAddr);
    }

    // Feedback: LED + buzzer pulse
    digitalWrite(Led, LOW);
    digitalWrite(Led, HIGH);
    digitalWrite(Buzzer, HIGH);
    delay(50);
    digitalWrite(Led, LOW);
    digitalWrite(Buzzer, LOW);

    delay(50);

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
  }
}
