import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Header from './components/Header';
import MainConsole from './components/MainConsole';
import ConnectionPanel from './components/ConnectionPanel';
import Instructions from './components/Instructions';

// Initialize socket outside component to prevent multiple connections
const socket = io("http://localhost:5000", { transports: ["websocket"] });

function App() {
  const [activePage, setActivePage] = useState('main');
  const [connectionState, setConnectionState] = useState({
    connected: false,
    port: null,
    online: false
  });

  // Poll connection status
  const checkConnection = async () => {
    try {
      const res = await fetch('/api/connection_status');
      const data = await res.json();
      setConnectionState({
        connected: data.connected,
        port: data.port,
        online: data.online
      });
    } catch (err) {
      console.error("Connection check failed", err);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 2000);
    
    socket.on('connect', () => console.log("Socket connected"));
    socket.on('port_removed', () => checkConnection());

    return () => {
      clearInterval(interval);
      socket.off('connect');
      socket.off('port_removed');
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col text-white">
      <Header activePage={activePage} setActivePage={setActivePage} />

      <main className="flex-1 pt-48 px-6">
        {activePage === 'main' ? (
          <div className="flex flex-col space-y-6 ml-36 transition-all duration-500 ease-in-out">
            
            {/* Main Grid */}
            <div className="w-full grid lg:grid-cols-3 gap-8">
              
              {/* Left Side: RFID Operations */}
              <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 h-[500px]">
                <MainConsole 
                  socket={socket} 
                  connectionState={connectionState}
                />
              </div>

              {/* Right Side: Connection */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 w-full border border-gray-700/50">
                <ConnectionPanel 
                  socket={socket} 
                  connectionState={connectionState}
                  refreshConnection={checkConnection}
                />
              </div>

            </div>
          </div>
        ) : (
          <div className="transition-all duration-500 ease-in-out">
            <Instructions />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;