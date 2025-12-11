
import React, { useState, useEffect } from 'react';
import { Delete } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const TARGET_PIN = '121988';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
      setError('');
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    if (pin.length === 6) {
      if (pin === TARGET_PIN) {
        onLogin();
      } else {
        setError('Incorrect PIN');
        setPin('');
      }
    }
  }, [pin, onLogin]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
          🐥
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2 font-mono">
          Welcome to POPO
        </h1>
        <p className="text-gray-500 mb-8 text-sm">
          Enter your 6-digit PIN to access your second brain.
        </p>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-8">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full transition-all ${
                i < pin.length ? 'bg-indigo-600 scale-110' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {error && <div className="text-red-500 text-sm mb-4 font-medium animate-pulse">{error}</div>}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 mb-6 select-none">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleDigit(num.toString())}
              className="h-14 rounded-xl bg-gray-50 hover:bg-gray-100 text-xl font-medium text-gray-700 transition-colors active:bg-gray-200 active:scale-95 transform duration-100"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleDigit('0')}
            className="h-14 rounded-xl bg-gray-50 hover:bg-gray-100 text-xl font-medium text-gray-700 transition-colors active:bg-gray-200 active:scale-95 transform duration-100"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-14 rounded-xl bg-gray-50 hover:bg-red-50 text-red-500 font-medium transition-colors flex items-center justify-center active:bg-red-100 active:scale-95 transform duration-100"
          >
            <Delete size={20} />
          </button>
        </div>
        
        <div className="text-xs text-gray-400">
             Secured Workspace
        </div>
      </div>
    </div>
  );
};

export default Login;
