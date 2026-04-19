import React, { useState } from 'react';
import { Play, StopCircle } from 'lucide-react';

const Writer = ({ socket, connectionState, isActive }) => {
  const [block, setBlock] = useState(4);
  const [isWritingMode, setIsWritingMode] = useState(false);
  const [dataInput, setDataInput] = useState('');
  const [delimiter, setDelimiter] = useState('#');

  const toggleWriteMode = async () => {
    if (!connectionState.connected) return alert("Connect COM first!");

    if (!isWritingMode) {
      // Start Writing Mode
      try {
        await fetch('/api/start_writing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'write', block: parseInt(block) })
        });
        setIsWritingMode(true);
      } catch (err) { console.error(err); }
    } else {
      // Stop Writing Mode
      try {
        await fetch('/api/stop_writing', { method: 'POST' });
        setIsWritingMode(false);
      } catch (err) { console.error(err); }
    }
  };

  const submitData = async () => {
    if (!dataInput.trim()) return alert("Enter data!");
    try {
      await fetch('/api/write_data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataInput.trim(), delimiter })
      });
      // Optional: clear input or show success
    } catch (err) {
      console.error(err);
      alert("Error sending data");
    }
  };

  return (
    <div className="flex flex-col justify-center space-y-6 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between w-full space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex items-center space-x-2">
          <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 20h9M12 4h9M4 9h16M4 15h16" />
          </svg>
          <div>
            <h2 className="text-2xl font-bold text-white">RFID Data Writer</h2>
            <p className="text-gray-400 text-sm">Enter data below and click write</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleWriteMode}
            className={`flex items-center justify-center gap-2 font-medium rounded-lg px-4 py-2 transition-colors ${isWritingMode ? 'bg-red-900 border-2 border-red-500 italic text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
          >
            {isWritingMode ? <StopCircle className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isWritingMode ? "Stop Writing" : "Start Writing"}</span>
          </button>

          <div className={`flex items-center space-x-2 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/50 ${isWritingMode ? 'opacity-50 pointer-events-none' : ''}`}>
            <label className="text-gray-300 font-medium">Block :</label>
            <select 
              value={block} 
              onChange={(e) => setBlock(e.target.value)}
              className="bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-600"
            >
              {[...Array(64).keys()].map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-gray-900/50 rounded-xl p-6 border-2 border-gray-600/50">
        <div className="mb-4">
          <label className="text-gray-300 text-sm">Delimiter:</label>
          <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)} className="ml-2 bg-black border border-gray-600 text-emerald-400 rounded px-2 py-1 text-sm">
            <option value="#">#</option>
            <option value="$">$</option>
          </select>
        </div>

        <textarea 
          value={dataInput}
          onChange={(e) => setDataInput(e.target.value)}
          className="w-full h-32 bg-black/30 rounded-lg p-4 font-mono text-emerald-400 resize-none mb-4" 
          placeholder="Enter data to write..."
        ></textarea>

        <button 
          onClick={submitData}
          disabled={!dataInput.trim()}
          className={`w-full font-medium rounded-lg px-4 py-2 transition-transform duration-150 ease-in-out active:scale-95 ${dataInput.trim() ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg' : 'bg-gray-500 text-gray-300'}`}
        >
          Write Data
        </button>
      </div>
    </div>
  );
};

export default Writer;