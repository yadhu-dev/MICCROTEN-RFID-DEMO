import React from 'react';
import { Wifi, FileText } from 'lucide-react';

const Header = ({ activePage, setActivePage }) => {
  const btnBase = "flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200";
  const btnActive = "bg-blue-600 text-white shadow-lg";
  const btnInactive = "text-gray-300 hover:text-white hover:bg-gray-700/50";

  return (
    <header className="fixed top-0 left-0 w-full shadow-md z-50 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50">
      <nav className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">MICCROTEN</h1>
          <p className="text-sm text-gray-300">RFID Operations Suite</p>
        </div>

        <ul className="flex space-x-6">
          <button 
            onClick={() => setActivePage('main')}
            className={`${btnBase} ${activePage === 'main' ? btnActive : btnInactive}`}
          >
            <Wifi className="h-4 w-4" />
            <span>Main Console</span>
          </button>

          <button 
            onClick={() => setActivePage('instructions')}
            className={`${btnBase} ${activePage === 'instructions' ? btnActive : btnInactive}`}
          >
            <FileText className="h-4 w-4" />
            <span>User Instructions</span>
          </button>
        </ul>
      </nav>
    </header>
  );
};
export default Header;