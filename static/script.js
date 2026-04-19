document.addEventListener("DOMContentLoaded", () => {
    // ===== ICONS =====
    lucide.createIcons();

    // ===== DOM ELEMENTS =====
    const mainBtn = document.getElementById("mainBtn");
    const instructionsBtn = document.getElementById("instructionsBtn");
    const mainPage = document.getElementById("mainPage");
    const instructionsPage = document.getElementById("instructionsPage");

    const readBtn = document.getElementById("readBtn");
    const writeBtn = document.getElementById("writeBtn");
    const flipCard = document.getElementById("flipCard");

    const blockDiv = document.getElementById('blockDiv');
    const uidDiv = document.getElementById('uidDiv');

    const blockSelect = document.getElementById('blockSelect');
    const blockSelect1 = document.getElementById('blockSelect1');

    const applyBtn = document.getElementById('applyBtn');

    const submitWriteBtn = document.getElementById('SubmitwriteBtn');
    const dataInput = document.getElementById('dataInput');
    const delimiter = document.getElementById('delimiter');

    const status_text = document.getElementById("status_text");
    const statusDot = document.getElementById("status_dot");

    const connectionButton = document.getElementById('connectionButton');
    const comSelect = document.getElementById('comSelect');
    const comLabel = document.querySelector('label[for="comSelect"]') || 
                     document.querySelector('.block.text-sm.font-medium.text-gray-300.mb-2');
    const buttonContent = document.getElementById('buttonContent');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const statusEl = document.getElementById('rfidStatus');

    const rfidText = document.getElementById("rfidText");

    const applyBtnW = document.getElementById("applyBlockBtn");
    const blockDiv1 = document.querySelector(".flex.items-center.space-x-2.bg-gray-800\\/50"); 

    const keystrokeMode = document.getElementById('keystrokeToggle');

    // ===== STATE VARIABLES =====
    let isWriting = false;
    let selectedMode = 'block';
    let isReading = false;
    let isConnected = false;
    let isConnecting = false;
    let currentPort = null;

    // ===== WRITE MODE TOGGLE =====
    applyBtnW.addEventListener("click", async () => {
        const block = parseInt(blockSelect1.value);
        if (!isWriting) {
            // Start Writing
            applyBtnW.innerHTML = `<i data-lucide="stop-circle" class="w-4 h-4"></i> Stop Writing`;
            applyBtnW.classList.remove("bg-green-600", "hover:bg-green-700", "border-green-500");
            applyBtnW.classList.add("bg-red-900", "border-2", "border-red-500", "italic");
            isWriting = true;
            blockDiv1.classList.add("opacity-50", "pointer-events-none");
            blockSelect.disabled = true;

            try {
                const res = await fetch('/api/start_writing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode: 'write', block })
                });
                const data = await res.json();
                console.log("JSON API sent to backend:", data);
            } catch (err) {
                console.error("Error activating write mode:", err);
            }
        } else {
            // Stop Writing
            applyBtnW.innerHTML = `<i data-lucide="play" class="w-4 h-4"></i> Start Writing`;
            applyBtnW.classList.remove("bg-red-900", "border-red-500", "italic");
            applyBtnW.classList.add("bg-green-600", "hover:bg-green-700", "border-2", "border-green-500");
            isWriting = false;
            blockDiv1.classList.remove("opacity-50", "pointer-events-none");
            blockSelect.disabled = false;

            try {
                const res = await fetch('/api/stop_writing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode: 'stop_write' })
                });
                const data = await res.json();
                console.log("API sent for stop writing:", data);
            } catch (err) {
                console.error("Error stopping write mode:", err);
            }
        }
        lucide.createIcons();
    });

    // ===== PAGE SWITCHING =====
    function setActivePage(page) {
        if (page === "main") {
            mainPage.classList.remove("hidden");
            instructionsPage.classList.add("hidden");
            mainBtn.classList.add("bg-blue-600", "text-white", "shadow-lg");
            mainBtn.classList.remove("text-gray-300", "hover:text-white", "hover:bg-gray-700/50");
            instructionsBtn.classList.remove("bg-blue-600", "text-white", "shadow-lg");
            instructionsBtn.classList.add("text-gray-300", "hover:text-white", "hover:bg-gray-700/50");
        } else {
            instructionsPage.classList.remove("hidden");
            mainPage.classList.add("hidden");
            instructionsBtn.classList.add("bg-blue-600", "text-white", "shadow-lg");
            instructionsBtn.classList.remove("text-gray-300", "hover:text-white", "hover:bg-gray-700/50");
            mainBtn.classList.remove("bg-blue-600", "text-white", "shadow-lg");
            mainBtn.classList.add("text-gray-300", "hover:text-white", "hover:bg-gray-700/50");
        }
    }

    mainBtn.addEventListener("click", () => setActivePage("main"));
    instructionsBtn.addEventListener("click", () => setActivePage("instructions"));

    // ===== MODE SELECTION =====
    function updateModeUI() {
        // Highlight selected mode
        if (selectedMode === 'block') {
            blockDiv.classList.add('bg-blue-500/50', 'border-blue-400');
            uidDiv.classList.remove('bg-blue-500/50', 'border-blue-400');
        } else {
            uidDiv.classList.add('bg-blue-500/50', 'border-blue-400');
            blockDiv.classList.remove('bg-blue-500/50', 'border-blue-400');
        }

        // Disable other mode when reading
        if (isReading) {
            if (selectedMode === 'block') {
                uidDiv.classList.add('bg-gray-500/50', 'border-gray-400', 'cursor-not-allowed');
                blockDiv.classList.remove('bg-gray-500/50', 'border-gray-400');
            } else {
                blockDiv.classList.add('bg-gray-500/50', 'border-gray-400', 'cursor-not-allowed');
                uidDiv.classList.remove('bg-gray-500/50', 'border-gray-400');
            }
            blockDiv.classList.remove('cursor-pointer');
            uidDiv.classList.remove('cursor-pointer');
        } else {
            blockDiv.classList.add('cursor-pointer');
            uidDiv.classList.add('cursor-pointer');
            blockDiv.classList.remove('cursor-not-allowed', 'bg-gray-500/50', 'border-gray-400');
            uidDiv.classList.remove('cursor-not-allowed', 'bg-gray-500/50', 'border-gray-400');
        }
    }

    function setMode(mode) {
        if (isReading) return;
        selectedMode = mode;
        updateModeUI();
    }

    blockDiv.addEventListener('click', () => setMode('block'));
    uidDiv.addEventListener('click', () => setMode('uid'));

    // ===== READ/WRITE TOGGLE =====
    function setRWMode(mode) {
        if (mode === 'read') {
            readBtn.classList.add("bg-blue-600", "text-white", "shadow-lg", "scale-105");
            writeBtn.classList.remove("bg-emerald-600", "text-white", "shadow-lg", "scale-105");
            flipCard.classList.remove("flip-active");
        } else {
            writeBtn.classList.add("bg-emerald-600", "text-white", "shadow-lg", "scale-105");
            readBtn.classList.remove("bg-blue-600", "text-white", "shadow-lg", "scale-105");
            flipCard.classList.add("flip-active");
        }
    }

    readBtn.addEventListener('click', async () => {
        try { await fetch('/api/stop_writing', { method: 'POST' }); } 
        catch (err) { console.error("Error stopping writing:", err); }

        setRWMode('read');
        applyBtnW.innerHTML = `<i data-lucide="play" class="w-4 h-4"></i> Start Writing`;
        applyBtnW.classList.remove("bg-red-900", "border-red-500", "italic");
        applyBtnW.classList.add("bg-green-600", "hover:bg-green-700", "border-2", "border-green-500");
        isWriting = false;
        blockDiv1.classList.remove("opacity-50", "pointer-events-none");
        blockSelect.disabled = false;
        lucide.createIcons();
    });

    writeBtn.addEventListener('click', async () => {
        if (isReading) {
            try { await fetch('/api/stop_reading', { method: 'POST' }); }
            catch (err) { console.error("Error stopping reading:", err); }

            isReading = false;
            applyBtn.classList.remove("bg-red-600", "hover:bg-red-700", "border-2", "border-red-700");
            applyBtn.classList.add("bg-emerald-600");
            applyBtn.innerHTML = `<i data-lucide="play" class="w-4 h-4"></i> Start Reading`;
            uidDiv.classList.remove("opacity-50", "pointer-events-none");
            blockDiv.classList.remove("opacity-50", "pointer-events-none");
            blockSelect.classList.remove("opacity-50", "pointer-events-none");
            lucide.createIcons();
            updateModeUI();
        }
        setRWMode('write');
    });

    // ===== FILL BLOCK SELECTORS =====
    [blockSelect, blockSelect1].forEach(sel => {
        for (let i = 0; i <= 63; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = i;
            if (i === 4) opt.selected = true;
            sel.appendChild(opt);
        }
    });

    // ===== APPLY BUTTON (READ) =====
    applyBtn.addEventListener('click', async () => {
    if (!selectedMode) return alert("Select UID or Block mode");
    const conn = await (await fetch('/api/connection_status')).json();
    if (!conn.connected) return alert("Connect COM first!");

    const block = blockSelect.value;

    if (!isReading) {
        // --- Start Reading ---
        isReading = true;

        // Update button UI
        applyBtn.classList.remove("bg-emerald-600");
        applyBtn.classList.add("bg-red-600", "hover:bg-red-700", "border-2", "border-red-700");
        applyBtn.innerHTML = `<i data-lucide="stop-circle" class="w-4 h-4"></i> Stop Reading`;
        lucide.createIcons();
        updateModeUI();

        // Disable the unselected mode
        if (selectedMode === 'uid') {
            blockDiv.classList.add("opacity-50", "pointer-events-none");
            uidDiv.classList.remove("opacity-50", "pointer-events-none");
            blockSelect.classList.add("opacity-50", "pointer-events-none");
        } else if (selectedMode === 'block') {
            uidDiv.classList.add("opacity-50", "pointer-events-none");
            blockDiv.classList.remove("opacity-50", "pointer-events-none");
            blockSelect.classList.add("opacity-50", "pointer-events-none");
        }

        // Start reading process
        fetch('/api/start_reading', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: selectedMode,
                block: selectedMode === 'block' ? parseInt(block) : 0
            })
        }).catch(err => console.error(err));

    } else {
        // --- Stop Reading ---
        isReading = false;

        // Update button UI
        applyBtn.classList.remove("bg-red-600", "hover:bg-red-700", "border-2", "border-red-700");
        applyBtn.classList.add("bg-emerald-600");
        applyBtn.innerHTML = `<i data-lucide="play" class="w-4 h-4"></i> Start Reading`;
        lucide.createIcons();

        if(!isReading){
            uidDiv.classList.remove("opacity-50", "pointer-events-none");
            blockDiv.classList.remove("opacity-50", "pointer-events-none");
            blockSelect.classList.remove("opacity-50", "pointer-events-none");
        }

        // Stop reading process
        // Stop reading process
fetch('/api/stop_reading', { method: 'POST' }).catch(err => console.error(err));
        updateModeUI();
    }
});

// ============ if Keystroke Mode is On ===============

keystrokeMode.addEventListener("change", async (e) => {
    const enabled = e.target.checked;

    try {
        const res = await fetch("/api/toggle_keystroke", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ enabled })
        });

        const data = await res.json();
        if (res.ok) {
            console.log(`Keystroke mode: ${data.status}`);
        } else {
            alert(`Error: ${data.message || "Failed to toggle"} `);
            e.target.checked = !enabled; // revert checkbox
        }
    } catch (err) {
        console.error(err);
        alert("Error toggling keystroke mode");
        e.target.checked = !enabled; // revert checkbox
    }
});


    // ===== SUBMIT WRITE BUTTON =====
    function updateSubmitButton() {
        if (dataInput.value.trim() !== '') {
            submitWriteBtn.disabled = false;
            submitWriteBtn.classList.add("bg-green-600", "hover:bg-green-700", "text-white", "shadow-lg");
            submitWriteBtn.classList.remove("bg-gray-500", "text-gray-300", "shadow-none");
        } else {
            submitWriteBtn.disabled = true;
            submitWriteBtn.classList.remove("bg-green-600", "hover:bg-green-700", "text-white", "shadow-lg");
            submitWriteBtn.classList.add("bg-gray-500", "text-gray-300", "shadow-none");
        }
    }

    submitWriteBtn.addEventListener("click", () => {
  // Add quick scale and ring highlight when clicked
  submitWriteBtn.classList.add(
    "scale-90",
    "ring-2",
    "ring-green-400",
    "ring-offset-2",
    "transition",
    "duration-150",
    "ease-in-out"
  );

  // Remove animation after short delay
  setTimeout(() => {
    submitWriteBtn.classList.remove(
      "scale-90",
      "ring-2",
      "ring-green-400",
      "ring-offset-2"
    );
  }, 150);
});

    dataInput.addEventListener('input', updateSubmitButton);
    updateSubmitButton();

    submitWriteBtn.addEventListener('click', async () => {
        const data = dataInput.value.trim();
        if (!data) return alert("Enter data!");
        const delim = delimiter.value;

        try {
            const res = await fetch('/api/write_data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, delimiter: delim })
            });
            const result = await res.json();
            console.log("Write data sent to backend:", result.message);
        } catch (err) {
            console.error(err);
            alert("Error sending data");
        }
    });

    // ===== CONNECTION BUTTON =====
    function updateConnectButton() {
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
            statusEl.textContent = '● Online';
            statusEl.className = 'text-green-500';
        } else {
            connectionButton.className = 'w-full px-6 py-2 rounded-lg flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white';
            buttonContent.innerHTML = '<i data-lucide="usb" class="ml-3"></i><span>Connect</span>';
            statusEl.textContent = '● Offline';
            statusEl.className = 'text-red-500';
            statusDot.classList.remove("blink-green");
            statusDot.classList.add("bg-gray-500");
            status_text.textContent = "Standby";
        }
        lucide.createIcons();
    }

    async function loadPorts() {
        if (isConnected) return;
        try {
            const res = await fetch('/api/serial_ports');
            const ports = await res.json();
            comSelect.innerHTML = '<option value="">Select a COM port...</option>';
            ports.forEach(port => {
                const opt = document.createElement('option');
                opt.value = port.device;
                opt.textContent = `${port.device} - ${port.description}`;
                comSelect.appendChild(opt);
            });
        } catch (err) {
            console.error(err);
        }
    }

    async function checkConnectionStatus() {
        try {
            const res = await fetch('/api/connection_status');
            const data = await res.json();
            isConnected = data.connected || false;
            currentPort = data.port || null;

            if (isConnected && currentPort) {
                comSelect.innerHTML = `<option value="${currentPort}">Connected to MICCROTEN_RFID</option>`;
                comLabel.textContent = "COM Port Selection";
            } else {
                await loadPorts();
            }
            updateConnectButton();
        } catch (err) {
            console.error(err);
        }
    }

    connectionButton.addEventListener('click', async () => {
        const port = comSelect.value;
        if (!port && !isConnected) return alert("Select COM port!");

        if (isConnected) {
            await fetch('/api/disconnect', { method: 'POST' });
            isConnected = false;
            checkConnectionStatus();
            return;
        }

        isConnecting = true;
        updateConnectButton();

        try {
            const res = await fetch('/api/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port })
            });
            const data = await res.json();

            if (!data.success) throw new Error(data.message);

            isConnected = true;
            currentPort = port;
            comSelect.innerHTML = `<option value="${port}">Connected to MICCROTEN_RFID</option>`;

            // Ping the device after connecting
            const pingRes = await fetch('/api/ping_device', { method: 'POST' });
            const pingData = await pingRes.json();
            if (pingData.success) {
                statusDot.classList.add("blink-green");
                statusDot.classList.remove("bg-gray-500");
                status_text.textContent = "Live";
            } else {
                statusDot.classList.remove("blink-green");
                statusDot.classList.add("bg-gray-500");
                status_text.textContent = "Standby";
            }
        } catch (err) {
            console.error(err);
            alert("Connection failed: " + err.message);
            isConnected = false;
        }

        isConnecting = false;
        updateConnectButton();
    });

    // ===== SOCKET.IO =====
    const socket = io("http://localhost:5000", { transports: ["websocket"] });

    socket.on('connect', () => console.log("Socket connected"));

    socket.on('rfid_data', msg => {
        if (rfidText) {
            rfidText.textContent = [...msg.data.trim()].join(" ");
            rfidText.classList.add("blink");
            rfidText.classList.remove("disconnected");
        }
    });

    socket.on('rfid_status', msg => {
        if (rfidText) {
            rfidText.textContent = msg.message;
            rfidText.style.color = 'lightgreen';
            rfidText.style.fontStyle = 'italic';
        }
    });

    socket.on('disconnect', () => {
        if (rfidText) {
            rfidText.textContent = 'Disconnected';
            rfidText.classList.remove("blink");
            rfidText.classList.add("disconnected");
        }
    });

    socket.on('port_added', msg => {
        console.log("Port added:", msg);
        loadPorts();
    });

    socket.on('port_removed', msg => {
        console.log("Port removed:", msg);
        checkConnectionStatus();
        loadPorts();
    });

    // ===== INITIALIZATION =====
    checkConnectionStatus();
    updateModeUI();
    updateSubmitButton();
    // setInterval(loadPorts, 15000);
});
