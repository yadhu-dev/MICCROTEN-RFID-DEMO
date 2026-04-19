document.addEventListener("DOMContentLoaded", () => {
    const connectionButton = document.getElementById('connectionButton');
    const comSelect = document.getElementById('comSelect');
    const comLabel = document.querySelector('label[for="comSelect"]') || document.querySelector('.block.text-sm.font-medium.text-gray-300.mb-2');
    const buttonContent = document.getElementById('buttonContent');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const statusDisplay = document.getElementById('statusDisplay');
    const statusEl = document.getElementById('rfidStatus');
    const rfidText = document.getElementById('rfidData');
    const applyBtn = document.getElementById('applyBtn');
    const blockSelect = document.getElementById('blockSelect');
    const keystrokeToggle = document.getElementById('keystrokeToggle');

    let isConnected = false;
    let isConnecting = false;
    let currentPort = null;
    let isReading = false;

    // ---------- INIT STATE ON PAGE LOAD ----------
    async function initState() {
        try {
            const res = await fetch('/api/connection_status');
            const data = await res.json();

            if (data.connected) {
                isConnected = true;
                currentPort = data.port;

                connectionButton.className = 'w-full px-6 py-2 rounded-lg flex items-center justify-center bg-orange-600 hover:bg-orange-700 text-white';
                buttonContent.innerHTML = '<i data-lucide="usb" class="ml-3"></i><span>Disconnect</span>';
                comSelect.innerHTML = `<option value="${currentPort}">Connected to MICCROTEN_RFID</option>`;
                comLabel.textContent = "COM Port Selection";
                statusEl.innerHTML = '● Online';
                statusEl.className = 'text-green-500';

                const readRes = await fetch('/api/reading_status');
                const readData = await readRes.json();
                if (readData.reading) {
                    applyBtn.textContent = "Reading started";
                    applyBtn.classList.remove("bg-emerald-600", "text-white");
                    applyBtn.classList.add(
                        "bg-emerald-900",
                        "hover:bg-emerald-700",
                        "text-emerald-200",
                        "border-2",
                        "border-emerald-700"
                    );
                }
            } else {
                isConnected = false;
                comSelect.innerHTML = '<option value="">Select a COM port...</option>';
                connectionButton.className = 'w-full px-6 py-2 rounded-lg flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white';
                buttonContent.innerHTML = '<i data-lucide="usb" class="ml-3"></i><span>Connect</span>';
                statusEl.innerHTML = '● Offline';
                statusEl.className = 'text-red-500';
            }
        } catch (err) {
            console.error("Failed to initialize state:", err);
        }
    }

    initState();   // call it to sync frontend with backend

    async function updateReadingButton() {
        try {
            const res = await fetch('/api/reading_status');
            const data = await res.json();

            if (data.reading) {
                applyBtn.textContent = "Reading started";
                applyBtn.classList.remove("bg-emerald-600", "text-white");
                applyBtn.classList.add(
                    "bg-emerald-900",
                    "hover:bg-emerald-700",
                    "text-emerald-200",
                    "border-2",
                    "border-emerald-700"
                );
            } else {
                applyBtn.textContent = "Start Reading";
                applyBtn.classList.remove(
                    "bg-emerald-900",
                    "hover:bg-emerald-700",
                    "text-emerald-200",
                    "border-2",
                    "border-emerald-700"
                );
                applyBtn.classList.add("bg-emerald-600", "text-white");
            }
        } catch (err) {
            console.error("Failed to update reading button:", err);
        }
    }

    // ---------- SOCKET.IO INITIALIZATION ----------
    const socket = io("http://localhost:5000", { transports: ["websocket"] });

    socket.on('connect', () => {
        console.log('Connected to SocketIO');
        checkRFIDWaitingState();
    });

    socket.on("rfid_data", function (msg) {
        const text = msg.data.trim();
        console.log("RFID:", text);
        const container = document.getElementById("rfidText");
        if (!container) return;
        if (container.textContent === "Waiting for data...") {
            container.classList.remove("waiting");
        }
        container.textContent = [...text].join(" ");
        container.classList.remove("disconnected");
        container.classList.add("blink");
    });

    initState();
    updateReadingButton();

    socket.on('rfid_status', (msg) => {
        console.log("RFID Status:", msg);
        const rfidText = document.getElementById("rfidText");
        if (rfidText) {
            rfidText.textContent = msg.message;
            rfidText.style.color = 'skyblue';
            rfidText.style.fontStyle = 'italic';
        }
    });

    socket.on('disconnect', () => {
        console.log(' Socket disconnected');
        const container = document.getElementById("rfidText");
        if (container) {
            container.textContent = 'Disconnected';
            container.classList.remove("blink", "waiting");
            container.classList.add("disconnected");
        }
    });

    async function checkRFIDWaitingState() {
        try {
            const res = await fetch("/api/connection_status");
            const data = await res.json();
            const container = document.getElementById("rfidText");
            if (!container) return;

            if (data.connected && data.online) {
                container.textContent = "Waiting for data...";
                container.classList.remove("blink", "disconnected");
                container.classList.add("waiting");
            } else if (!data.connected) {
                container.textContent = "Device not connected";
                container.classList.remove("blink", "waiting");
                container.classList.add("disconnected");
            } else {
                container.textContent = "Device standby...";
                container.classList.remove("blink");
                container.classList.add("waiting");
            }
        } catch (err) {
            console.error("RFID waiting state check failed:", err);
        }
        setTimeout(checkRFIDWaitingState, 25000);
    }

    function updateConnectButtonState() {
        connectionButton.disabled = (!comSelect.value && !isConnected) || isConnecting;
    }
    comSelect.addEventListener('change', updateConnectButtonState);

    async function loadPorts() {
        if (isConnected) return;
        try {
            const res = await fetch('/api/serial_ports');
            const ports = await res.json();
            comSelect.innerHTML = '<option value="">Select a COM port...</option>';
            ports.forEach(port => {
                const option = document.createElement('option');
                option.value = port.device;
                option.textContent = `${port.device} - ${port.description}`;
                comSelect.appendChild(option);
            });
            updateConnectButtonState();
        } catch (err) {
            console.error('Error loading serial ports:', err);
        }
    }

    function updateButton() {
        if (isConnecting) {
            buttonContent.classList.add('hidden');
            loadingSpinner.classList.remove('hidden');
            connectionButton.disabled = true;
            return;
        }

        buttonContent.classList.remove('hidden');
        loadingSpinner.classList.add('hidden');
        connectionButton.disabled = false;

        if (isConnected) {
            connectionButton.className = 'w-full px-6 py-2 rounded-lg flex items-center justify-center bg-orange-600 hover:bg-orange-700 text-white';
            buttonContent.innerHTML = '<i data-lucide="usb" class="ml-3"></i><span>Disconnect</span>';
            statusDisplay.classList.remove('hidden');
        } else {
            connectionButton.className = 'w-full px-6 py-2 rounded-lg flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white';
            buttonContent.innerHTML = '<i data-lucide="usb" class="ml-3"></i><span>Connect</span>';
            statusDisplay.classList.add('hidden');
        }

        if (window.lucide) lucide.createIcons();
    }

    async function checkConnectionStatus() {
        try {
            const res = await fetch('/api/connection_status');
            const data = await res.json();
            if (data.connected) {
                isConnected = true;
                currentPort = data.port;
                updateButton();
                comSelect.innerHTML = `<option value="${currentPort}">Connected to MICCROTEN_RFID</option>`;
                comLabel.textContent = "COM Port Selection";
            } else {
                loadPorts();
            }
        } catch (err) {
            console.error("Error checking connection status:", err);
            loadPorts();
        }
    }

    // ---------- CONNECT / DISCONNECT ----------
    connectionButton.addEventListener('click', async () => {
        const selectedPort = comSelect.value;

        if (!selectedPort && !isConnected) {
            alert("Please select a COM port first!");
            return;
        }

        if (isConnected) {
            // Disconnect with auto-reload
            try {
                const res = await fetch('/api/disconnect', { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    location.reload(); // <-- reload page automatically
                } else {
                    alert("Failed to disconnect: " + data.message);
                }
            } catch (err) {
                console.error('Error disconnecting:', err);
            }
            return;
        }

        // Connect
        isConnecting = true;
        updateButton();

        try {
            const res = await fetch('/api/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port: selectedPort })
            });
            const data = await res.json();

            setTimeout(() => {
                isConnecting = false;
                isConnected = data.success;
                currentPort = data.success ? selectedPort : null;
                updateButton();

                if (data.success) {
                    comSelect.innerHTML = `<option value="${selectedPort}">Connected to MICCROTEN_RFID</option>`;
                    comLabel.textContent = "COM Port Selection";
                }

                alert(data.message);
            }, 800);
        } catch (err) {
            console.error('Error connecting:', err);
            isConnecting = false;
            updateButton();
        }
    });
// ---------- START / STOP READING TOGGLE ----------
    applyBtn.addEventListener('click', async () => {
            if (!selectedMode) {
                alert("Please select UID or Block mode first!");
                return;
            }

            const selectedBlock = blockSelect.value;

            if (!isConnected) {
                alert("Please connect to a COM port first!");
                return;
            }

            if (!isReading) {
                // ----- START READING -----
                isReading = true;
                applyBtn.classList.remove("bg-emerald-600", "text-white");
                applyBtn.classList.add("bg-red-600", "hover:bg-red-700", "text-white", "border-2", "border-red-700");
                applyBtn.innerHTML = `<i data-lucide="stop-circle" class="w-4 h-4"></i> <span>Stop Reading</span>`;

                try {
                    const res = await fetch('/api/start_reading', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            mode: selectedMode, // 'uid' or 'block'
                            block: selectedMode === 'block' ? parseInt(selectedBlock) : 0
                        })
                    });
                    const data = await res.json();
                    if (!data.success) {
                        alert("Error: " + data.message);
                        // Reset button if API fails
                        isReading = false;
                        applyBtn.classList.remove("bg-red-600", "hover:bg-red-700", "border-2", "border-red-700");
                        applyBtn.classList.add("bg-emerald-600", "text-white");
                        applyBtn.innerHTML = `<i data-lucide="play" class="w-4 h-4"></i> <span>Start Reading</span>`;
                    }
                } catch (err) {
                    console.error("Error starting reading:", err);
                    isReading = false;
                    applyBtn.classList.remove("bg-red-600", "hover:bg-red-700", "border-2", "border-red-700");
                    applyBtn.classList.add("bg-emerald-600", "text-white");
                    applyBtn.innerHTML = `<i data-lucide="play" class="w-4 h-4"></i> <span>Start Reading</span>`;
                }

            } else {
                // ----- STOP READING -----
                isReading = false;
                applyBtn.classList.remove("bg-red-600", "hover:bg-red-700", "border-2", "border-red-700");
                applyBtn.classList.add("bg-emerald-600", "text-white");
                applyBtn.innerHTML = `<i data-lucide="play" class="w-4 h-4"></i> <span>Start Reading</span>`;

                try {
                    const res = await fetch('/api/stop_reading', { method: 'POST' });
                    const data = await res.json();
                    if (!data.success) {
                        alert("Error stopping reading: " + data.message);
                    }
                } catch (err) {
                    console.error("Error stopping reading:", err);
                }
            }

            if (window.lucide) lucide.createIcons();
    });


    // ---------- TOGGLE KEYSTROKE ----------
    keystrokeToggle.addEventListener('change', async () => {
        const enabled = keystrokeToggle.checked;
        try {
            await fetch('/api/toggle_keystroke', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled })
            });
            console.log("Keystroke mode:", enabled);
        } catch (err) {
            console.error("Failed to toggle keystroke mode:", err);
        }
    });

    // ---------- DEVICE STATUS ----------
    async function checkDeviceStatus() {
        if (!isConnected) return;

        try {
            const res = await fetch('/api/connection_status');
            const data = await res.json();

            const onlineInbox = document.getElementById('online_inbox');
            const statusDot = document.getElementById('status_dot');
            const statusText = document.getElementById('status_text');

            if (!data.connected) {
                statusDot.className = 'w-2 h-2 rounded-full bg-red-500';
                statusText.textContent = 'Reading Stopped';
                onlineInbox.classList.add('text-gray-500', 'text-sm');
                statusEl.innerHTML = '● Offline';
                statusEl.className = 'text-red-500';
            } else if (data.online) {
                statusDot.className = 'w-2 h-2 rounded-full blink-green';
                statusText.textContent = 'Live';
                statusText.className = 'text-green-500 italic text-sm';
                onlineInbox.classList.remove('text-gray-500');
                statusEl.innerHTML = '● Online';
                statusEl.className = 'text-green-500';
            } else {
                statusDot.className = 'w-2 h-2 rounded-full bg-gray-500';
                statusText.textContent = 'Standby';
                onlineInbox.classList.add('text-gray-500');
                statusEl.innerHTML = '● Offline';
                statusEl.className = 'text-red-500';
            }
        } catch (err) {
            console.error("Device status error:", err);
        }
    }

    // ---------- INIT ----------
    checkConnectionStatus();
    setInterval(checkDeviceStatus, 2000);
    setInterval(loadPorts, 15000);
    updateButton();
});
