from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO, emit
import serial
import serial.tools.list_ports
import threading
import time
import pyautogui
import logging

# --------------------------------------------
# Flask & SocketIO Initialization
# --------------------------------------------
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# --------------------------------------------
# Global Variables
# --------------------------------------------
ser = None
connected_port = None
device_online = False
keyStroke_enabled = False
serial_buffer = ""
read_loop_active = False
last_read_data = ""
lock = threading.Lock()

# Configure logging
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")

# --------------------------------------------
# Serial Communication Helpers
# --------------------------------------------
def get_serial_ports():
    """
    Return all available serial ports as a list of dictionaries.
    If description contains 'Arduino', rename it to 'MICCROTEN_RFID'.
    """
    port_list = []
 
    try:
        ports = serial.tools.list_ports.comports()
        for p in ports:
            desc = p.description
            if "Arduino" in desc or "YourDeviceID" in desc:
                desc = "MICCROTEN_RFID"
            port_list.append({"device": p.device, "description": desc})
    except Exception as e:
        logging.error(f"Failed to list ports: {e}")

    return port_list


def connect_Atmega(port, retries=5, delay=0.5):
    """
    Attempt to connect to the specified serial port with retries.
    """
    global ser, connected_port, device_online

    for attempt in range(retries):
        try:
            if ser and ser.is_open:
                ser.close()
                time.sleep(0.2)

            ser = serial.Serial(port, 115200, timeout=0.1)
            time.sleep(0.5)

            connected_port = port
            device_online = True
            logging.info(f"Connected to {port} on attempt {attempt + 1}")
            return ser

        except PermissionError:
            time.sleep(delay)

    raise PermissionError(f"Could not open port {port} after {retries} attempts")


def disconnect_Atmega():
    """
    Safely disconnect the current serial device.
    """
    global ser, connected_port, device_online, read_loop_active
    read_loop_active = False

    if ser:
        ser.close()

    ser = None
    connected_port = None
    device_online = False
    logging.info("Device disconnected")


def read_from_serial():
    """
    Continuously read from serial and emit RFID packets to frontend.
    """
    global ser, serial_buffer, keyStroke_enabled, read_loop_active, last_read_data
    serial_buffer = ""

    while read_loop_active and ser:
        try:
            chunk = ser.read(ser.in_waiting or 1).decode(errors="ignore")
            serial_buffer += chunk

            # Extract full <...> packets
            while "<" in serial_buffer and ">" in serial_buffer:
                start = serial_buffer.index("<")
                end = serial_buffer.index(">", start)
                packet = serial_buffer[start + 1:end]
                serial_buffer = serial_buffer[end + 1:]

                if packet:
                    last_read_data = packet
                    logging.info(f"RFID Data: {packet}")
                    socketio.emit("rfid_data", {"data": packet})

                    if keyStroke_enabled:
                        pyautogui.typewrite(packet)
                        pyautogui.press("enter")

        except Exception:
            pass

        time.sleep(0.05)


def monitor_connection():
    """
    Monitor if the connected serial port is still available.
    Automatically disconnects if removed.
    """
    global ser, connected_port, device_online

    while True:
        time.sleep(1)

        if connected_port:
            ports = [p.device for p in serial.tools.list_ports.comports()]

            if connected_port not in ports:
                logging.warning(f"Port {connected_port} removed — auto disconnecting.")
                disconnect_Atmega()
            else:
                device_online = True


def monitor_ports():
    """
    Continuously monitor system serial ports and notify frontend when ports
    are added or removed.
    """
    previous_ports = {p.device: p.description for p in serial.tools.list_ports.comports()}

    while True:
        time.sleep(1)
        current_ports_list = list(serial.tools.list_ports.comports())
        current_ports = {p.device: p.description for p in current_ports_list}

        added = set(current_ports.keys()) - set(previous_ports.keys())
        removed = set(previous_ports.keys()) - set(current_ports.keys())

        for port in added:
            desc = current_ports[port]
            port_name = "MICCROTEN RFID" if "Arduino" in desc else port
            logging.info(f"Port added: {port_name} ({desc})")
            socketio.emit("port_added", {"port": port_name, "api_key": "YOUR_API_KEY_HERE"})

        for port in removed:
            desc = previous_ports[port]
            port_name = "MICCROTEN RFID" if "Arduino" in desc else port
            logging.info(f"Port removed: {port_name} ({desc})")
            socketio.emit("port_removed", {"port": port_name, "api_key": "YOUR_API_KEY_HERE"})

        previous_ports = current_ports


# --------------------------------------------
# Flask Routes with Detailed Developer Comments
# --------------------------------------------

@app.route("/")
def home():
    """
    Render the main frontend page.

    Frontend Usage:
        GET request from browser.

    Returns:
        HTML page 'index.html'
    """
    return render_template("index.html")


@app.route("/api/serial_ports", methods=["GET"])
def serial_ports():
    """
    Fetch a list of all available serial ports on the system.

    Frontend Usage:
        GET request from the frontend to populate COM port dropdown.

    Returns (JSON):
        [
            {"device": "COM3", "description": "MICCROTEN_RFID"},
            {"device": "COM4", "description": "SomeOtherDevice"}
        ]
    """
    try:
        return jsonify(get_serial_ports())
    except Exception as e:
        logging.error(f"Error listing ports: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/connect", methods=["POST"])
def connect_device():
    """
    Connect to a serial device (Atmega/Arduino).

    Frontend Usage:
        POST JSON: {"port": "COM3"}

    Process:
        - Attempts to open the serial port.
        - Sets 'ser', 'connected_port', and 'device_online' flags.

    Returns (JSON):
        On success:
            {"success": True, "message": "Connected to COM3"}
        On failure:
            {"success": False, "message": "Error message"}
    """
    data = request.get_json()
    port_name = data.get("port")

    try:
        connect_Atmega(port_name)
        return jsonify({"success": True, "message": f"Connected to {port_name}"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})


@app.route("/api/disconnect", methods=["POST"])
def disconnect_device():
    """
    Disconnect the currently connected serial device.

    Frontend Usage:
        POST request when user clicks 'Disconnect'.

    Process:
        - Closes serial port.
        - Resets global flags: 'ser', 'connected_port', 'device_online'.

    Returns (JSON):
        {"success": True, "message": "Disconnected successfully"}
    """
    disconnect_Atmega()
    return jsonify({"success": True, "message": "Disconnected successfully"})


@app.route("/api/reading_status", methods=["GET"])
def reading_status():
    """
    Check if RFID reading is currently active.

    Frontend Usage:
        GET request to update UI (Start/Stop button state).

    Returns (JSON):
        {"reading": True/False}
    """
    return jsonify({"reading": read_loop_active})


@app.route("/api/toggle_keystroke", methods=["POST"])
def toggle_keystroke():
    """
    Enable or disable automatic typing of RFID data.

    Frontend Usage:
        POST JSON: {"enabled": true/false}
        Checkbox toggle in frontend.

    Process:
        - Updates global 'keyStroke_enabled'.
        - If enabled, each RFID read will be typed automatically using pyautogui.

    Returns (JSON):
        {"status": "enabled" or "disabled"}
    """
    global keyStroke_enabled
    data = request.get_json()
    keyStroke_enabled = data.get("enabled", False)
    logging.info(f"Keystroke mode: {keyStroke_enabled}")
    return jsonify({"status": "enabled" if keyStroke_enabled else "disabled"})


@app.route("/api/start_writing", methods=["POST"])
def start_writing():
    """
    Start write mode for a specific block on RFID card.

    Frontend Usage:
        POST JSON: {"block": 5}  # block number to write

    Process:
        - Sends command '@&<block>\n' to Atmega over serial.
        - Prepares device to receive write data.

    Returns (JSON):
        On success:
            {"message": "Write mode started for block 5"}
        On failure (no serial connection):
            {"message": "Serial port not connected"}
    """
    data = request.get_json()
    block = data.get("block")

    if ser and ser.is_open:
        cmd = f"@&{block}\n"
        ser.write(cmd.encode())
        logging.info(f"Write mode started for block {block}")
        return jsonify({"message": f"Write mode started for block {block}"}), 200

    return jsonify({"message": "Serial port not connected"}), 400


@app.route("/api/write_data", methods=["POST"])
def write_data():
    """
    Send actual data to RFID card while write mode is active.

    Frontend Usage:
        POST JSON: {"data": "Hello", "delimiter": ";"}

    Process:
        - Writes data to serial device.
        - Emits SocketIO event 'rfid_status' to frontend for real-time UI update.

    Returns (JSON):
        {"success": True, "message": "Data sent: Hello"}
    """
    if not ser or not ser.is_open:
        return jsonify({"success": False, "message": "Device not connected"}), 400

    try:
        data = request.get_json()
        content = data.get("data", "")
        delim = data.get("delimiter", "")
        ser.write(f"{content}{delim}\n".encode())

        socketio.emit("rfid_status", {"message": f"Data sent: {content}"})
        return jsonify({"success": True, "message": f"Data sent: {content}"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})


@app.route("/api/ping_device", methods=["POST"])
def ping_device():
    """
    Ping the connected Atmega device to verify it is live.

    Frontend Usage:
        POST request for "Check Device Status" button.

    Process:
        - Sends '_' character repeatedly.
        - Waits for '__' response from device.
        - Retries multiple times before failing.

    Returns (JSON):
        Success:
            {"success": True, "message": "Device is live"}
        Failure:
            {"success": False, "message": "No response from device"}
    """
    global ser

    if not ser or not ser.is_open:
        return jsonify({"success": False, "message": "Device not connected"}), 400

    try:
        ser.reset_input_buffer()
        max_retries = 5
        delay_between = 0.3

        for _ in range(max_retries):
            ser.write(b"_\n")
            time.sleep(0.1)

            response = ""
            start_time = time.time()
            while time.time() - start_time < 1:
                if ser.in_waiting:
                    response += ser.read(ser.in_waiting).decode(errors="ignore")
                if "__" in response:
                    return jsonify({"success": True, "message": "Device is live"})

            time.sleep(delay_between)

        return jsonify({"success": False, "message": "No response from device"}), 500
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/stop_writing", methods=["POST"])
def stop_writing():
    """
    Stop write mode on the RFID device.

    Frontend Usage:
        POST request when user clicks "Stop Writing".

    Process:
        - Sends ';' command to Atmega.
        - Emits 'rfid_status' event to update frontend.
    """
    if ser and ser.is_open:
        try:
            ser.write(b";\n")
            socketio.emit("rfid_status", {"message": "Write mode stopped"})
            return jsonify({"success": True, "message": "Write mode stopped"})
        except Exception as e:
            return jsonify({"success": False, "message": str(e)})

    return jsonify({"success": False, "message": "Device not connected"})


@app.route("/api/connection_status", methods=["GET"])
def connection_status():
    """
    Check current device connection and online status.

    Frontend Usage:
        GET request for periodic UI update.

    Returns (JSON):
        {
            "connected": True/False,
            "port": "COM3",
            "online": True/False
        }
    """
    try:
        return jsonify({
            "connected": ser is not None and ser.is_open and connected_port is not None,
            "port": connected_port,
            "online": device_online
        })
    except Exception as e:
        # Return disconnected state instead of 500 to prevent frontend crash
        return jsonify({"connected": False, "port": None, "online": False})


@app.route("/api/start_reading", methods=["POST"])
def start_reading():
    """
    Start reading RFID data in UID or Block mode.

    Frontend Usage:
        POST JSON: {"mode": "uid"} OR {"mode": "block", "block": 5}

    Process:
        - Starts reading thread if not already running.
        - Sends command to Atmega:
            UID mode: '*' 
            Block mode: '-&<block>'
        - Emits 'rfid_status' event to update frontend.

    Returns (JSON):
        {"success": True, "message": "Reading started in UID mode"}
    """
    global ser, read_loop_active
    data = request.get_json()
    mode = data.get("mode")
    block_no = data.get("block", 0)

    if not ser or not ser.is_open:
        return jsonify({"success": False, "message": "Device not connected"}), 400

    if not read_loop_active:
        read_loop_active = True
        threading.Thread(target=read_from_serial, daemon=True).start()

    cmd = None
    if mode == "uid":
        cmd = "*\n"
        socketio.emit("rfid_status", {"message": "Reading UID..."})
    elif mode == "block":
        cmd = f"-&{block_no}\n"
        socketio.emit("rfid_status", {"message": f"Reading block {block_no}..."})
    else:
        return jsonify({"success": False, "message": "Invalid mode"}), 400

    try:
        ser.write(cmd.encode())
        msg = f"Reading started in {mode.upper()} mode"
        if mode == "block":
            msg += f" (Block {block_no})"
        return jsonify({"success": True, "message": msg})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})


@app.route("/api/stop_reading", methods=["POST"])
def stop_reading():
    """
    Stop RFID reading.

    Frontend Usage:
        POST request when user clicks "Stop Reading".

    Process:
        - Sends ';' command to Atmega.
        - Sets read_loop_active = False.
        - Stops emitting data to frontend.
    """
    global ser, read_loop_active

    if ser and ser.is_open:
        ser.write(b";\n")
        read_loop_active = False
        return jsonify({"success": True, "message": "Reading stopped"})

    return jsonify({"success": False, "message": "Device not connected"})

# --------------------------------------------
# Main Entry Point
# --------------------------------------------
if __name__ == "__main__":
    threading.Thread(target=monitor_connection, daemon=True).start()
    threading.Thread(target=monitor_ports, daemon=True).start()
    socketio.run(app, debug=True)
