import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";

export interface CreatorHistoryItem {
  id: number;
  mode: string;
  project_title: string;
  state_payload: any;
  created_at: string;
}

interface CreatorHistoryDropdownProps {
  mode: string;
  currentTitle: string;
  projectName: string;
  onLoadState: (state: any) => void;
  onSaveCurrentSession: () => void;
  onGetDirectState?: () => any;
  disabled?: boolean;
}

export function CreatorHistoryDropdown({
  mode,
  currentTitle,
  projectName,
  onLoadState,
  onSaveCurrentSession,
  onGetDirectState,
  disabled = false,
}: CreatorHistoryDropdownProps) {
  const [history, setHistory] = useState<CreatorHistoryItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/creator-history/${mode}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch creator history:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, mode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSave = async () => {
    if (!currentTitle?.trim() || !projectName?.trim()) {
      toast.error("Dê um título ao projeto e certifique-se que foi criado.");
      return;
    }

    // Force save the latest session first so that the backend picks up the latest state from disk
    onSaveCurrentSession();

    setIsSaving(true);
    try {
      const payload: any = {
        mode,
        project_name: projectName,
        project_title: currentTitle,
      };

      if (onGetDirectState) {
        payload.directState = onGetDirectState();
      }

      const res = await fetch("/api/creator-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Salvo no histórico!");
        fetchHistory();
        setIsOpen(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Erro ao salvar no histórico.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar no histórico.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg p-0.5">
        <button
          type="button"
          disabled={disabled || isSaving}
          onClick={handleSave}
          className="px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
          title="Salvar rascunho no histórico"
        >
          {isSaving ? (
            <span className="w-3 h-3 rounded-full border-2 border-zinc-500 border-t-white animate-spin"></span>
          ) : (
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
          )}
          Salvar
        </button>
        <div className="w-px h-4 bg-zinc-700"></div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-50"
          title="Ver histórico"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
          <div className="bg-zinc-950 px-3 py-2 border-b border-zinc-800 flex justify-between items-center">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Histórico (Últimos 5)
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {history.length === 0 ? (
              <div className="px-4 py-6 text-center text-zinc-500 text-xs">
                Nenhum projeto salvo neste modo ainda.
              </div>
            ) : (
              <ul className="divide-y divide-zinc-800">
                {history.map((item) => (
                  <li
                    key={item.id}
                    className="hover:bg-zinc-800/50 transition-colors"
                  >
                    <button
                      onClick={() => {
                        onLoadState(item.state_payload);
                        setIsOpen(false);
                        toast.success(`Carregado: ${item.project_title}`);
                      }}
                      className="w-full text-left px-3 py-2 flex flex-col gap-1"
                    >
                      <span className="text-sm font-medium text-zinc-200 truncate">
                        {item.project_title}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
