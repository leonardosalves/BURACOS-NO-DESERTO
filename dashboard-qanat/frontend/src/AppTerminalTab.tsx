import React from 'react';
import { DashminProjectTabLayout } from './DashminProjectTabLayout';

export type AppTerminalTabProps = {
  activeProject: string;
  logs: string[];
  setLogs: React.Dispatch<React.SetStateAction<string[]>>;
  terminalEndRef: React.RefObject<HTMLDivElement | null>;
};

export function AppTerminalTab({
  activeProject,
  logs,
  setLogs,
  terminalEndRef,
}: AppTerminalTabProps) {
  return (
    <DashminProjectTabLayout
      tab="terminal"
      activeProject={activeProject}
      className="lumiera-fill-view"
      actions={
        <button
          onClick={() => setLogs([])}
          className="text-xs text-gray-400 hover:text-white font-semibold cursor-pointer border border-zinc-850 px-3 py-1.5 rounded-lg hover:bg-zinc-900 transition"
        >
          Limpar Console
        </button>
      }
    >
      <div className="lumiera-fill-view space-y-4 min-h-0 flex-1">
        <div className="flex-1 bg-[#040405] border border-zinc-900 rounded-2xl p-5 font-mono text-xs text-emerald-400 overflow-y-auto space-y-1.5 select-text shadow-inner min-h-[50vh]">
          {logs.length === 0 ? (
            <div className="text-zinc-600 italic">
              Console ocioso. Inicie uma compilação ou mixagem para exibir os logs em tempo real...
            </div>
          ) : (
            logs.map((log, i) => (
              <div
                key={i}
                className={
                  log.startsWith('[ERRO]')
                    ? 'text-red-400'
                    : log.startsWith('[Dashboard]')
                      ? 'text-blue-400 font-bold'
                      : ''
                }
              >
                {log}
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </DashminProjectTabLayout>
  );
}