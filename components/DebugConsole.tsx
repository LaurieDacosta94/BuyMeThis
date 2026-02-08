import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Trash2, ChevronUp, ChevronDown, Bug, Activity } from 'lucide-react';

interface LogEntry {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: string;
  details?: any;
}

export const DebugConsole: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Intercept console methods
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    const addLog = (type: LogEntry['type'], args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setLogs(prev => [...prev.slice(-49), { // Keep last 50 logs
        id: Math.random().toString(36).substr(2, 9),
        type,
        message,
        timestamp: new Date().toLocaleTimeString(),
        details: args.length > 1 ? args : undefined
      }]);
    };

    console.log = (...args) => {
      addLog('log', args);
      originalLog.apply(console, args);
    };

    console.warn = (...args) => {
      addLog('warn', args);
      originalWarn.apply(console, args);
    };

    console.error = (...args) => {
      addLog('error', args);
      originalError.apply(console, args);
    };
    
    console.info = (...args) => {
      addLog('info', args);
      originalInfo.apply(console, args);
    };

    // Capture unhandled errors
    const handleError = (event: ErrorEvent) => {
      addLog('error', [`Uncaught Error: ${event.message}`, event.error]);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      addLog('error', [`Unhandled Promise Rejection:`, event.reason]);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      console.info = originalInfo;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  useEffect(() => {
    if (isOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  const toggle = () => setIsOpen(!isOpen);
  const clear = () => setLogs([]);

  if (!isOpen) {
    return (
      <button 
        onClick={toggle}
        className="fixed bottom-4 left-4 z-[9999] bg-black/80 text-[#00ff00] p-2 rounded-full shadow-lg border border-[#00ff00]/30 hover:bg-black transition-all"
        title="Open Debug Console"
      >
        <Terminal className="h-5 w-5" />
        {logs.some(l => l.type === 'error') && (
           <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full animate-pulse border border-black" />
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9999] w-[90vw] md:w-[600px] bg-[#1e1e1e] rounded-lg shadow-2xl border border-[#333] flex flex-col font-mono text-xs overflow-hidden animate-in slide-in-from-bottom-5">
      
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#333]">
        <div className="flex items-center gap-2 text-slate-300">
          <Bug className="h-4 w-4 text-[#007acc]" />
          <span className="font-semibold">DevTools Console</span>
          <span className="bg-[#333] px-1.5 rounded text-[10px]">{logs.length} events</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clear} className="p-1 hover:bg-[#333] rounded text-slate-400 hover:text-white" title="Clear">
            <Trash2 className="h-4 w-4" />
          </button>
          <button onClick={toggle} className="p-1 hover:bg-[#333] rounded text-slate-400 hover:text-white" title="Minimize">
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Logs Area */}
      <div className="h-64 overflow-y-auto bg-[#1e1e1e] p-2 space-y-1 custom-scrollbar">
        {logs.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-[#444] gap-2">
              <Activity className="h-8 w-8 opacity-20" />
              <p>No logs captured yet.</p>
           </div>
        ) : (
           logs.map((log) => (
            <div key={log.id} className={`flex gap-2 p-1 rounded hover:bg-[#2a2d2e] break-all ${
              log.type === 'error' ? 'text-red-400 bg-red-900/10 border-l-2 border-red-500' :
              log.type === 'warn' ? 'text-yellow-400 bg-yellow-900/10 border-l-2 border-yellow-500' :
              'text-slate-300'
            }`}>
              <span className="opacity-50 shrink-0 select-none">[{log.timestamp}]</span>
              <div className="whitespace-pre-wrap">{log.message}</div>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
};