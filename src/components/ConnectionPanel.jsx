import React, { useState, useEffect } from 'react';
import { Usb } from 'lucide-react';

const ConnectionPanel = ({ socket, connectionState, refreshConnection }) => {
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const loadPorts = async () => {
    if (connectionState.connected) return;
    try {
      const res = await fetch('/api/serial_ports');
      if (!res.ok) return; // Skip if server is down or erroring
      const data = await res.json();
      if (Array.isArray(data)) {
        setPorts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadPorts();
    socket.on('port_added', loadPorts);
    return () => socket.off('port_added', loadPorts);
  }, [connectionState.connected]);

  const handleConnect = async () => {
    if (connectionState.connected) {
      // Disconnect
      await fetch('/api/disconnect', { method: 'POST' });
      refreshConnection();
      return;
    }

    if (!selectedPort) return alert("Select a COM port!");

    setIsConnecting(true);
    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: selectedPort })
      });
      const data = await res.json();
      if (data.success) {
        // Ping device to ensure it's live
        await fetch('/api/ping_device', { method: 'POST' });
        refreshConnection();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
    setIsConnecting(false);
  };

  return (
    <div>
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
        <Usb className="text-gray-600 ml-12 mr-2" />
        Connection
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">COM Port Selection</label>
          {connectionState.connected ? (
            <div className="w-full px-4 py-3 bg-gray-900 border border-green-500 rounded-lg text-green-400">
              Connected to {connectionState.port}
            </div>
          ) : (
            <select 
              value={selectedPort} 
              onChange={(e) => setSelectedPort(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600/50 rounded-lg text-green-400 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a COM port...</option>
              {ports.map(p => (
                <option key={p.device} value={p.device}>{p.device} - {p.description}</option>
              ))}
            </select>
          )}
        </div>

        <button 
          onClick={handleConnect}
          disabled={isConnecting || (!selectedPort && !connectionState.connected)}
          className={`w-full px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${connectionState.connected ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'} text-white disabled:bg-gray-600 disabled:cursor-not-allowed`}
        >
          {isConnecting ? (
            <svg className="loading-spinner w-5 h-5" viewBox="25 25 50 50"><circle r="20" cy="50" cx="50"></circle></svg>
          ) : (
            <>
              <Usb className="w-4 h-4 mr-2" />
              <span>{connectionState.connected ? "Disconnect" : "Connect"}</span>
            </>
          )}
        </button>

        <div className="pt-4 border-t border-gray-700/50 text-xs space-y-1">
          <p>📡 RFID Reader Status</p>
          <p className={connectionState.online ? "text-green-500" : "text-red-500"}>● {connectionState.online ? "Online" : "Offline"}</p>
        </div>
      </div>
    </div>
  );
};

export default ConnectionPanel;