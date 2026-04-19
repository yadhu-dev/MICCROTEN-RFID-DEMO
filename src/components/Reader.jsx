import React, { useState, useEffect } from 'react';
import { Activity, Play, StopCircle, Usb, KeyRound } from 'lucide-react';

const Reader = ({ socket, connectionState, isActive }) => {
  const [readMode, setReadMode] = useState('block'); // 'block' or 'uid'
  const [selectedBlock, setSelectedBlock] = useState(4);
  const [isReading, setIsReading] = useState(false);
  const [rfidText, setRfidText] = useState("Waiting for data...");
  const [textClass, setTextClass] = useState("waiting");
  const [keystrokeEnabled, setKeystrokeEnabled] = useState(false);

  // Socket Listeners
  useEffect(() => {
    const handleData = (msg) => {
      const text = msg.data.trim();
      console.log("RFID:", text);
      setRfidText([...text].join(" "));
      setTextClass("blink-text");
    };

    const handleStatus = (msg) => {
      console.log("RFID Status:", msg);
      setRfidText(msg.message);
      setTextClass("text-sky-300 italic");
    };

    socket.on('rfid_data', handleData);
    socket.on('rfid_status', handleStatus);

    return () => {
      socket.off('rfid_data', handleData);
      socket.off('rfid_status', handleStatus);
    };
  }, [socket]);

  // Update status text based on connection
  useEffect(() => {
    if (!connectionState.connected) {
      setRfidText("Device not connected");
      setTextClass("disconnected");
    } else if (connectionState.online) {
      if (textClass === 'disconnected') {
        setRfidText("Waiting for data...");
        setTextClass("waiting");
      }
    }
  }, [connectionState, textClass]);

  const toggleReading = async () => {
    if (!connectionState.connected) return alert("Connect COM first!");

    if (!isReading) {
      // Start
      try {
        const res = await fetch('/api/start_reading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: readMode,
            block: readMode === 'block' ? parseInt(selectedBlock) : 0
          })
        });
        const data = await res.json();
        console.log("Start reading response:", data);
        setIsReading(true);
      } catch (err) {
        console.error(err);
      }
    } else {
      // Stop
      try {
        const res = await fetch('/api/stop_reading', { method: 'POST' });
        const data = await res.json();
        console.log("Stop reading response:", data);
        setIsReading(false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleKeystroke = async (e) => {
    const enabled = e.target.checked;
    console.log(`Attempting to set keystroke enabled to: ${enabled}`);
    setKeystrokeEnabled(enabled);

    try {
      const res = await fetch("/api/toggle_keystroke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled })
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      console.log("Successfully set keystroke mode:", data);
    } catch (err) {
      console.error("Error toggling keystroke:", err);
      console.log("Failed to toggle keystroke, reverting state.");
      setKeystrokeEnabled(!enabled);
    }
  };

  const getStatusUI = () => {
    if (!connectionState.connected) {
      return { dot: "bg-red-500", text: "Offline", textClass: "text-gray-500" };
    }
    if (connectionState.online) {
      return { dot: "blink-green", text: "Live", textClass: "text-green-500 italic" };
    }
    return { dot: "bg-gray-500", text: "Standby", textClass: "text-gray-500" };
  };

  const statusUI = getStatusUI();

  return (
    <div className="flex flex-col justify-between space-y-6 h-full">
      {/* Header */}
      <div className="flex items-start justify-between space-x-6">
        <div className="flex-1">
          <h2 className="text-2xl text-white mb-2 flex items-center space-x-2">
            <Activity className="text-blue-600" />
            <span>RFID Data Reader</span>
          </h2>
          <p className="text-gray-400">Real-time RFID tag data will appear below when connected</p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-4 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/50">
          <div className="flex space-x-2">
            <div 
              onClick={() => !isReading && setReadMode('block')}
              className={`flex items-center space-x-3 rounded-2xl p-4 border cursor-pointer transition-all ${readMode === 'block' ? 'bg-blue-500/50 border-blue-400' : 'bg-gray-800/50 border-gray-700/50'} ${isReading && readMode !== 'block' ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <label className="text-gray-300 font-medium cursor-pointer">Block :</label>
              <select 
                value={selectedBlock} 
                onChange={(e) => setSelectedBlock(e.target.value)}
                disabled={isReading}
                className="bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600"
              >
                {[...Array(64).keys()].map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div 
              onClick={() => !isReading && setReadMode('uid')}
              className={`flex items-center space-x-3 rounded-2xl p-4 border cursor-pointer transition-all ${readMode === 'uid' ? 'bg-blue-500/50 border-blue-400' : 'bg-gray-800/50 border-gray-700/50'} ${isReading && readMode !== 'uid' ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <span className="text-gray-300 font-medium">UID</span>
            </div>
          </div>

          <button 
            onClick={toggleReading}
            className={`px-4 py-2 rounded-lg shadow-lg transition-all duration-200 flex items-center space-x-2 ${isReading ? 'bg-red-600 hover:bg-red-700 border-2 border-red-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
          >
            {isReading ? <StopCircle className="w-4 h-4 text-white" /> : <Play className="w-4 h-4" />}
            <span className="text-white">{isReading ? "Stop Reading" : "Start Reading"}</span>
          </button>
        </div>
      </div>

      {/* Data Stream */}
      <div className="bg-gray-900/50 rounded-xl p-6 border-2 border-gray-600/50">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-300">Data Stream</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${statusUI.dot}`}></div>
            <span className={`text-xs ${statusUI.textClass}`}>{statusUI.text}</span>
          </div>
        </div>

        <div className="min-h-[120px] bg-black/30 rounded-lg p-4 font-mono flex items-center justify-center">
          <div className="text-center">
            <Usb className="text-gray-600 mx-auto mb-4" />
            <p className={`text-lg font-semibold ${textClass}`} style={{ fontFamily: "'Courier New', monospace" }}>
              {rfidText}
            </p>
          </div>
        </div>
      </div>

      {/* Keystroke */}
      <div className="pt-6 border-t border-gray-700/50 mb-8 pb-2">
        <h3 className="text-xl font-semibold text-white flex items-center">
          <KeyRound className="text-gray-600 ml-2 mr-2" />
          Enable Keystroke
        </h3>

        <label className="relative inline-flex items-center cursor-pointer mt-2">
          <input type="checkbox" className="sr-only peer" checked={keystrokeEnabled} onChange={toggleKeystroke} />
          <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-blue-600
              after:content-[''] after:absolute after:top-[2px] after:left-[2px]
              after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 
              after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white">
          </div>
          <span className="ml-3 text-sm font-medium text-gray-300">Enable/Disable</span>
        </label>
      </div>
    </div>
  );
};

export default Reader;