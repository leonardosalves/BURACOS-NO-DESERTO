import React, { useMemo, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Folder,
  LayoutList,
  Plus,
  Search,
  Smartphone,
  Trash2,
  Tv,
  X,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';

export type ProjectListItem = {
  name: string;
  path: string;
  format?: 'LONGO' | 'SHORTS';
  title?: string;
  niche?: string;
  modifiedAt?: string;
  modifiedAtMs?: number;
};

type ProjectsLibraryPanelProps = {
  projects: ProjectListItem[];
  activeProject: string;
  recentProjects: string[];
  onSelectProject: (name: string) => void;
  onRequestCreate: (format: 'LONGO' | 'SHORTS', niche?: string) => void;
  onDeleteProject: (name: string) => void;
};

type ViewMode = 'date' | 'niche';

function matchesSearch(proj: ProjectListItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [proj.name, proj.title, proj.niche, proj.format].some(
    (field) => String(field || '').toLowerCase().includes(q),
  );
}

function sortByDate(list: ProjectListItem[]) {
  return [...list].sort(
    (a, b) => (b.modifiedAtMs ?? 0) - (a.modifiedAtMs ?? 0),
  );
}

function groupByNiche(list: ProjectListItem[]) {
  const grouped = list.reduce<Record<string, ProjectListItem[]>>((acc, proj) => {
    const nicheName = (proj.niche || 'Geral').trim() || 'Geral';
    if (!acc[nicheName]) acc[nicheName] = [];
    acc[nicheName].push(proj);
    return acc;
  }, {});
  for (const key of Object.keys(grouped)) {
    grouped[key] = sortByDate(grouped[key]);
  }
  return grouped;
}

function formatRelativeDate(ms?: number) {
  if (!ms) return '—';
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  if (days < 30) return `há ${Math.floor(days / 7)} sem`;
  return new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ProjectRow({
  proj,
  isSelected,
  isChecked,
  cleanupMode,
  pendingDelete,
  onSelect,
  onToggleCheck,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  proj: ProjectListItem;
  isSelected: boolean;
  isChecked: boolean;
  cleanupMode: boolean;
  pendingDelete: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const isShort = proj.format === 'SHORTS';
  const isConfirming = pendingDelete;

  return (
    <div
      className={`rounded-xl border transition ${
        isConfirming
          ? 'border-red-500/50 bg-red-500/5'
          : isSelected
            ? 'border-dash-primary/35 bg-dash-primary/5'
            : isChecked
              ? 'border-amber-500/30 bg-amber-500/5'
              : 'border-zinc-800/70 bg-zinc-950/40 hover:border-zinc-700/80'
      }`}
    >
      <div className="flex items-center gap-2 px-2.5 py-2 min-h-[44px]">
        {cleanupMode && (
          <input
            type="checkbox"
            checked={isChecked}
            onChange={onToggleCheck}
            className="w-3.5 h-3.5 rounded border-zinc-700 accent-red-500 shrink-0 cursor-pointer"
            aria-label={`Selecionar ${proj.name}`}
          />
        )}

        <button
          type="button"
          onClick={onSelect}
          className="flex-1 min-w-0 flex items-center gap-2.5 text-left"
        >
          {isShort ? (
            <Smartphone className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-400' : 'text-zinc-600'}`} />
          ) : (
            <Tv className={`w-4 h-4 shrink-0 ${isSelected ? 'text-gold-400' : 'text-zinc-600'}`} />
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-zinc-200 truncate" title={proj.title || proj.name}>
              {proj.title || proj.name}
            </span>
            <span className="block text-[9px] text-zinc-600 truncate">
              {proj.niche || 'Geral'} · {proj.name}
            </span>
          </span>
          <span className="text-[9px] text-zinc-500 tabular-nums shrink-0 hidden sm:block" title={proj.modifiedAt || ''}>
            {formatRelativeDate(proj.modifiedAtMs)}
          </span>
        </button>

        {!cleanupMode && !isConfirming && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRequestDelete(); }}
            className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/25 transition shrink-0"
            title="Excluir projeto"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {isConfirming && (
        <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 pt-0 border-t border-red-500/20">
          <p className="text-[10px] text-red-300/90 pl-1">
            Excluir <strong className="font-semibold">{proj.title || proj.name}</strong> permanentemente?
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onCancelDelete}
              className="text-[9px] px-2.5 py-1 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirmDelete}
              className="text-[9px] px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold"
            >
              Excluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FormatColumn({
  format,
  projects,
  activeProject,
  viewMode,
  collapsedNiches,
  onToggleNiche,
  onSelectProject,
  onRequestCreate,
  pendingDeleteName,
  setPendingDeleteName,
  onDeleteProject,
  cleanupMode,
  selectedNames,
  onToggleSelect,
}: {
  format: 'LONGO' | 'SHORTS';
  projects: ProjectListItem[];
  activeProject: string;
  viewMode: ViewMode;
  collapsedNiches: Record<string, boolean>;
  onToggleNiche: (key: string) => void;
  onSelectProject: (name: string) => void;
  onRequestCreate: (format: 'LONGO' | 'SHORTS', niche?: string) => void;
  pendingDeleteName: string | null;
  setPendingDeleteName: (name: string | null) => void;
  onDeleteProject: (name: string) => void;
  cleanupMode: boolean;
  selectedNames: Set<string>;
  onToggleSelect: (name: string) => void;
}) {
  const isShort = format === 'SHORTS';
  const filtered = projects.filter((p) => (isShort ? p.format === 'SHORTS' : p.format !== 'SHORTS'));
  const sorted = sortByDate(filtered);

  const renderRow = (proj: ProjectListItem) => (
    <ProjectRow
      key={proj.name}
      proj={proj}
      isSelected={activeProject === proj.name}
      isChecked={selectedNames.has(proj.name)}
      cleanupMode={cleanupMode}
      pendingDelete={pendingDeleteName === proj.name}
      onSelect={() => onSelectProject(proj.name)}
      onToggleCheck={() => onToggleSelect(proj.name)}
      onRequestDelete={() => setPendingDeleteName(proj.name)}
      onConfirmDelete={() => {
        onDeleteProject(proj.name);
        setPendingDeleteName(null);
      }}
      onCancelDelete={() => setPendingDeleteName(null)}
    />
  );

  const grouped = groupByNiche(sorted);
  const nicheEntries = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/30 overflow-hidden flex flex-col min-h-0">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/20">
        <div className="flex items-center gap-2 min-w-0">
          {isShort ? (
            <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <Tv className="w-4 h-4 text-gold-400 shrink-0" />
          )}
          <div>
            <p className="text-sm font-bold text-white">{isShort ? 'Shorts' : 'Longos'}</p>
            <p className="text-[9px] text-zinc-500">{isShort ? '9:16' : '16:9'} · mais recentes primeiro</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-zinc-500 tabular-nums">{filtered.length}</span>
          <button
            type="button"
            onClick={() => onRequestCreate(format, 'Geral')}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:border-gold-500/30 text-gold-400 transition"
            title={`Novo ${isShort ? 'Short' : 'Longo'}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-zinc-500 italic py-8 text-center px-4">
          Nenhum projeto {isShort ? 'short' : 'longo'} ainda.
        </p>
      ) : viewMode === 'date' ? (
        <div className="p-2 space-y-1.5 max-h-[min(68vh,32rem)] overflow-y-auto">
          {sorted.map(renderRow)}
        </div>
      ) : (
        <div className="p-2 space-y-2 max-h-[min(68vh,32rem)] overflow-y-auto">
          {nicheEntries.map(([nicheName, projList]) => {
            const collapseKey = `${isShort ? 'short' : 'long'}-${nicheName}`;
            const isCollapsed = collapsedNiches[collapseKey] ?? !projList.some((p) => p.name === activeProject);
            return (
              <div key={collapseKey} className="rounded-xl border border-zinc-800/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => onToggleNiche(collapseKey)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-zinc-900/40 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Folder className="w-3.5 h-3.5 text-gold-500/70 shrink-0" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide truncate">
                      {nicheName}
                    </span>
                    <span className="text-[9px] text-zinc-600 tabular-nums">({projList.length})</span>
                  </div>
                  {isCollapsed ? <ChevronRight className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
                </button>
                {!isCollapsed && (
                  <div className="px-1.5 pb-1.5 space-y-1">
                    {projList.map(renderRow)}
                    <button
                      type="button"
                      onClick={() => onRequestCreate(format, nicheName)}
                      className="w-full text-[9px] text-zinc-600 hover:text-gold-400 py-1 transition"
                    >
                      + Novo em {nicheName}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ProjectsLibraryPanel({
  projects,
  activeProject,
  recentProjects,
  onSelectProject,
  onRequestCreate,
  onDeleteProject,
}: ProjectsLibraryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('date');
  const [collapsedNiches, setCollapsedNiches] = useState<Record<string, boolean>>({});
  const [pendingDeleteName, setPendingDeleteName] = useState<string | null>(null);
  const [cleanupMode, setCleanupMode] = useState(false);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  const filteredProjects = useMemo(() => {
    const list = searchQuery.trim() ? projects.filter((p) => matchesSearch(p, searchQuery)) : projects;
    return sortByDate(list);
  }, [projects, searchQuery]);

  const longCount = projects.filter((p) => p.format !== 'SHORTS').length;
  const shortCount = projects.filter((p) => p.format === 'SHORTS').length;

  const toggleNiche = (key: string) => {
    setCollapsedNiches((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSelect = (name: string) => {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const exitCleanupMode = () => {
    setCleanupMode(false);
    setSelectedNames(new Set());
    setPendingDeleteName(null);
  };

  const handleBatchDelete = async () => {
    if (!selectedNames.size) return;
    const names = [...selectedNames];
    setBatchDeleting(true);
    try {
      for (const name of names) {
        await Promise.resolve(onDeleteProject(name));
      }
      setSelectedNames(new Set());
      setCleanupMode(false);
    } finally {
      setBatchDeleting(false);
    }
  };

  return (
    <div className="lumiera-panel-stack animate-fade-in font-sans min-w-0 space-y-4">
      <SectionHeader
        title="Biblioteca de Projetos"
        helpId="tab-projects"
        size="lg"
        icon={<Folder className="w-6 h-6 text-gold-400 shrink-0" />}
        subtitle={`${projects.length} projetos · ${longCount} longos · ${shortCount} shorts · ordenados por data`}
        trailing={
          activeProject ? (
            <span className="text-[10px] text-gold-400/90 bg-gold-500/10 border border-gold-500/20 px-2 py-1 rounded-lg max-w-[200px] truncate">
              Ativo: {activeProject}
            </span>
          ) : null
        }
      />

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar título, pasta ou nicho..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold-500/40"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex rounded-xl border border-zinc-800 p-0.5 bg-zinc-950">
            <button
              type="button"
              onClick={() => setViewMode('date')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition ${
                viewMode === 'date' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Calendar className="w-3 h-3" />
              Por data
            </button>
            <button
              type="button"
              onClick={() => setViewMode('niche')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition ${
                viewMode === 'niche' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <LayoutList className="w-3 h-3" />
              Por nicho
            </button>
          </div>

          <button
            type="button"
            onClick={() => (cleanupMode ? exitCleanupMode() : setCleanupMode(true))}
            className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-semibold transition ${
              cleanupMode
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
            }`}
          >
            {cleanupMode ? 'Sair limpeza' : 'Limpeza em lote'}
          </button>
        </div>
      </div>

      {searchQuery.trim() ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/30 p-3 space-y-1.5">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1 mb-2">
            Resultados ({filteredProjects.length})
          </p>
          {filteredProjects.length === 0 ? (
            <p className="text-sm text-zinc-500 italic px-1">Nenhum projeto encontrado.</p>
          ) : (
            filteredProjects.map((proj) => (
              <ProjectRow
                key={proj.name}
                proj={proj}
                isSelected={activeProject === proj.name}
                isChecked={selectedNames.has(proj.name)}
                cleanupMode={cleanupMode}
                pendingDelete={pendingDeleteName === proj.name}
                onSelect={() => onSelectProject(proj.name)}
                onToggleCheck={() => toggleSelect(proj.name)}
                onRequestDelete={() => setPendingDeleteName(proj.name)}
                onConfirmDelete={() => {
                  onDeleteProject(proj.name);
                  setPendingDeleteName(null);
                }}
                onCancelDelete={() => setPendingDeleteName(null)}
              />
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <FormatColumn
            format="LONGO"
            projects={projects}
            activeProject={activeProject}
            viewMode={viewMode}
            collapsedNiches={collapsedNiches}
            onToggleNiche={toggleNiche}
            onSelectProject={onSelectProject}
            onRequestCreate={onRequestCreate}
            pendingDeleteName={pendingDeleteName}
            setPendingDeleteName={setPendingDeleteName}
            onDeleteProject={onDeleteProject}
            cleanupMode={cleanupMode}
            selectedNames={selectedNames}
            onToggleSelect={toggleSelect}
          />
          <FormatColumn
            format="SHORTS"
            projects={projects}
            activeProject={activeProject}
            viewMode={viewMode}
            collapsedNiches={collapsedNiches}
            onToggleNiche={toggleNiche}
            onSelectProject={onSelectProject}
            onRequestCreate={onRequestCreate}
            pendingDeleteName={pendingDeleteName}
            setPendingDeleteName={setPendingDeleteName}
            onDeleteProject={onDeleteProject}
            cleanupMode={cleanupMode}
            selectedNames={selectedNames}
            onToggleSelect={toggleSelect}
          />
        </div>
      )}

      {cleanupMode && selectedNames.size > 0 && (
        <div className="sticky bottom-3 z-20 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-red-500/30 bg-zinc-950/95 backdrop-blur-md shadow-xl">
          <span className="text-[11px] text-zinc-300">
            <strong className="text-red-300 tabular-nums">{selectedNames.size}</strong> projeto(s) selecionado(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedNames(new Set())}
              className="p-1.5 text-zinc-500 hover:text-zinc-300"
              title="Limpar seleção"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={batchDeleting}
              onClick={() => { void handleBatchDelete(); }}
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white"
            >
              {batchDeleting ? 'Excluindo…' : 'Excluir selecionados'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}