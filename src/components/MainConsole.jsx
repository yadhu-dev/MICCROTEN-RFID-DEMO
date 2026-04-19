import React, { useState } from 'react';
import { BookOpen, Edit3 } from 'lucide-react';
import Reader from './Reader';
import Writer from './Writer';

const MainConsole = ({ socket, connectionState }) => {
  const [isWriteMode, setIsWriteMode] = useState(false);

  const handleModeSwitch = async (mode) => {
    if (mode === 'read') {
      try { 
        const res = await fetch('/api/stop_writing', { method: 'POST' }); 
        const data = await res.json();
        console.log("API sent for stop writing:", data);
      } catch (e) { console.error(e); }
      setIsWriteMode(false);
    } else {
      try { 
        const res = await fetch('/api/stop_reading', { method: 'POST' }); 
        const data = await res.json();
        console.log("API sent for stop reading:", data);
      } catch (e) { console.error(e); }
      setIsWriteMode(true);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Mode Toggles */}
      <div className="absolute -top-24 left-0">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-2 border border-gray-700/50">
          <div className="flex space-x-2">
            <button 
              onClick={() => handleModeSwitch('read')}
              className={`flex items-center space-x-3 px-6 py-4 rounded-xl transition-all duration-300 ${
                !isWriteMode 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 scale-105" 
                  : "text-gray-300 hover:text-white hover:bg-gray-700/50"
              }`}
            >
              <BookOpen className="h-5 w-5" />
              <span className="font-medium">Read Mode</span>
            </button>

            <button 
              onClick={() => handleModeSwitch('write')}
              className={`flex items-center space-x-3 px-6 py-4 rounded-xl transition-all duration-300 ${
                isWriteMode 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 scale-105" 
                  : "text-gray-300 hover:text-white hover:bg-gray-700/50"
              }`}
            >
              <Edit3 className="h-5 w-5" />
              <span className="font-medium">Write Mode</span>
            </button>
          </div>
        </div>
      </div>

      {/* Flip Card Container */}
      <div className="relative w-full h-[380px] perspective mt-4">
        <div 
          id="flipCard" 
          className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${isWriteMode ? 'flip-active' : ''}`}
        >
          
          {/* FRONT: Reader */}
          <div className="absolute w-full h-full backface-hidden">
            <Reader 
              socket={socket} 
              connectionState={connectionState} 
              isActive={!isWriteMode}
            />
          </div>

          {/* BACK: Writer */}
          <div className="absolute w-full h-full backface-hidden rotate-x-180">
            <Writer 
              socket={socket} 
              connectionState={connectionState}
              isActive={isWriteMode}
            />
          </div>

        </div>
      </div>
    </div>
  );
};

export default MainConsole;