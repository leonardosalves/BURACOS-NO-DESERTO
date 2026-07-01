import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  Plus,
  Search,
  Smartphone,
  Trash2,
  Tv,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';

export type ProjectListItem = {
  name: string;
  path: string;
  format?: 'LONGO' | 'SHORTS';
  title?: string;
  niche?: string;
};

type ProjectsLibraryPanelProps = {
  projects: ProjectListItem[];
  activeProject: string;
  recentProjects: string[];
  onSelectProject: (name: string) => void;
  onRequestCreate: (format: 'LONGO' | 'SHORTS', niche?: string) => void;
  onDeleteProject: (name: string) => void;
};

function matchesSearch(proj: ProjectListItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [proj.name, proj.title, proj.niche, proj.format].some(
    (field) => String(field || '').toLowerCase().includes(q),
  );
}

function groupByNiche(list: ProjectListItem[]) {
  return list.reduce<Record<string, ProjectListItem[]>>((acc, proj) => {
    const nicheName = (proj.niche || 'Geral').trim() || 'Geral';
    if (!acc[nicheName]) acc[nicheName] = [];
    acc[nicheName].push(proj);
    return acc;
  }, {});
}

function ProjectCard({
  proj,
  isSelected,
  onSelect,
  onDelete,
  deleting,
  onConfirmDelete,
  onCancelDelete,
}: {
  proj: ProjectListItem;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  deleting: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const isShort = proj.format === 'SHORTS';
  return (
    <div className="flex items-center gap-2 group">
      <button
        type="button"
        onClick={onSelect}
        className={`flex-1 text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 min-w-0 border ${
          isSelected
            ? 'bg-gold-500/10 border-gold-500/30 text-gold-300'
            : 'bg-zinc-950/40 border-zinc-800/60 text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
        }`}
      >
        {isShort ? (
          <Smartphone className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-zinc-600'}`} />
        ) : (
          <Tv className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-gold-400' : 'text-zinc-600'}`} />
        )}
        <span className="min-w-0 flex-1 line-clamp-2" title={proj.title || proj.name}>
          {proj.title || proj.name}
        </span>
      </button>
      {deleting ? (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onConfirmDelete}
            className="text-[9px] bg-red-500 hover:bg-red-600 text-white font-bold px-2 py-1 rounded-lg"
          >
            Sim
          </button>
          <button
            type="button"
            onClick={onCancelDelete}
            className="text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-2 py-1 rounded-lg"
          >
            Não
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onDelete}
          className="p-2 text-zinc-600 hover:text-red-400 hover:bg-zinc-900/50 rounded-lg opacity-0 group-hover:opacity-100 transition shrink-0"
          title="Excluir projeto"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function FormatColumn({
  format,
  projects,
  activeProject,
  collapsedNiches,
  onToggleNiche,
  onSelectProject,
  onRequestCreate,
  deletingName,
  setDeletingName,
  onDeleteProject,
}: {
  format: 'LONGO' | 'SHORTS';
  projects: ProjectListItem[];
  activeProject: string;
  collapsedNiches: Record<string, boolean>;
  onToggleNiche: (key: string) => void;
  onSelectProject: (name: string) => void;
  onRequestCreate: (format: 'LONGO' | 'SHORTS', niche?: string) => void;
  deletingName: string | null;
  setDeletingName: (name: string | null) => void;
  onDeleteProject: (name: string) => void;
}) {
  const isShort = format === 'SHORTS';
  const filtered = projects.filter((p) => (isShort ? p.format === 'SHORTS' : p.format !== 'SHORTS'));
  const grouped = groupByNiche(filtered);
  const nicheEntries = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));

  return (
    <div className="glass-panel rounded-3xl p-5 space-y-4 min-h-0">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          {isShort ? (
            <Smartphone className="w-5 h-5 text-amber-400 shrink-0" />
          ) : (
            <Tv className="w-5 h-5 text-gold-400 shrink-0" />
          )}
          <div>
            <p className="text-sm font-bold text-white font-cinzel">
              {isShort ? 'Shorts' : 'Longos'}
            </p>
            <p className="text-[10px] text-zinc-500">{isShort ? '9:16 vertical' : '16:9 horizontal'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-zinc-500 tabular-nums">{filtered.length} projeto(s)</span>
          <button
            type="button"
            onClick={() => onRequestCreate(format, 'Geral')}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 text-gold-400 transition"
            title={`Novo ${isShort ? 'Short' : 'Longo'}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-zinc-500 italic py-6 text-center">
          Nenhum projeto {isShort ? 'short' : 'longo'} ainda.
        </p>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
          {nicheEntries.map(([nicheName, projList]) => {
            const collapseKey = `${isShort ? 'short' : 'long'}-${nicheName}`;
            const isCollapsed = collapsedNiches[collapseKey] ?? !projList.some((p) => p.name === activeProject);
            return (
              <div
                key={collapseKey}
                className="rounded-2xl border border-zinc-800/60 bg-zinc-950/30 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => onToggleNiche(collapseKey)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-zinc-900/40 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Folder className="w-3.5 h-3.5 text-gold-500/70 shrink-0" />
                    <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide truncate">
                      {nicheName}
                    </span>
                    <span className="text-[9px] text-zinc-600 tabular-nums shrink-0">({projList.length})</span>
                  </div>
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-600 shrink-0" />
                  )}
                </button>
                {!isCollapsed && (
                  <div className="px-2 pb-2 space-y-1.5">
                    {projList.map((proj) => (
                      <ProjectCard
                        key={proj.name}
                        proj={proj}
                        isSelected={activeProject === proj.name}
                        onSelect={() => onSelectProject(proj.name)}
                        onDelete={() => setDeletingName(proj.name)}
                        deleting={deletingName === proj.name}
                        onConfirmDelete={() => {
                          onDeleteProject(proj.name);
                          setDeletingName(null);
                        }}
                        onCancelDelete={() => setDeletingName(null)}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => onRequestCreate(format, nicheName)}
                      className="w-full text-[10px] text-zinc-500 hover:text-gold-400 py-1.5 transition"
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
  const [collapsedNiches, setCollapsedNiches] = useState<Record<string, boolean>>({});
  const [deletingName, setDeletingName] = useState<string | null>(null);

  const filteredProjects = useMemo(
    () => (searchQuery.trim() ? projects.filter((p) => matchesSearch(p, searchQuery)) : projects),
    [projects, searchQuery],
  );

  const recentList = useMemo(
    () => recentProjects
      .map((name) => projects.find((p) => p.name === name))
      .filter((p): p is ProjectListItem => Boolean(p)),
    [recentProjects, projects],
  );

  const longCount = projects.filter((p) => p.format !== 'SHORTS').length;
  const shortCount = projects.filter((p) => p.format === 'SHORTS').length;

  const toggleNiche = (key: string) => {
    setCollapsedNiches((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="lumiera-panel-stack animate-fade-in font-sans min-w-0 space-y-5">
      <SectionHeader
        title="Biblioteca de Projetos"
        helpId="tab-projects"
        size="lg"
        icon={<Folder className="w-6 h-6 text-gold-400 shrink-0" />}
        subtitle={`${projects.length} projetos · ${longCount} longos · ${shortCount} shorts`}
        trailing={
          activeProject ? (
            <span className="text-[10px] text-gold-400/90 bg-gold-500/10 border border-gold-500/20 px-2 py-1 rounded-lg max-w-[200px] truncate">
              Ativo: {activeProject}
            </span>
          ) : null
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por título, nicho ou pasta..."
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold-500/40"
        />
      </div>

      {searchQuery.trim() ? (
        <div className="glass-panel rounded-3xl p-5 space-y-2">
          <p className="text-xs font-bold text-zinc-400 mb-3">
            Resultados ({filteredProjects.length})
          </p>
          {filteredProjects.length === 0 ? (
            <p className="text-sm text-zinc-500 italic">Nenhum projeto encontrado.</p>
          ) : (
            filteredProjects.map((proj) => (
              <ProjectCard
                key={proj.name}
                proj={proj}
                isSelected={activeProject === proj.name}
                onSelect={() => onSelectProject(proj.name)}
                onDelete={() => setDeletingName(proj.name)}
                deleting={deletingName === proj.name}
                onConfirmDelete={() => {
                  onDeleteProject(proj.name);
                  setDeletingName(null);
                }}
                onCancelDelete={() => setDeletingName(null)}
              />
            ))
          )}
        </div>
      ) : (
        <>
          {recentList.length > 0 && (
            <div className="glass-panel rounded-3xl p-5 space-y-3">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Recentes</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {recentList.map((proj) => (
                  <ProjectCard
                    key={`recent-${proj.name}`}
                    proj={proj}
                    isSelected={activeProject === proj.name}
                    onSelect={() => onSelectProject(proj.name)}
                    onDelete={() => setDeletingName(proj.name)}
                    deleting={deletingName === proj.name}
                    onConfirmDelete={() => {
                      onDeleteProject(proj.name);
                      setDeletingName(null);
                    }}
                    onCancelDelete={() => setDeletingName(null)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <FormatColumn
              format="LONGO"
              projects={projects}
              activeProject={activeProject}
              collapsedNiches={collapsedNiches}
              onToggleNiche={toggleNiche}
              onSelectProject={onSelectProject}
              onRequestCreate={onRequestCreate}
              deletingName={deletingName}
              setDeletingName={setDeletingName}
              onDeleteProject={onDeleteProject}
            />
            <FormatColumn
              format="SHORTS"
              projects={projects}
              activeProject={activeProject}
              collapsedNiches={collapsedNiches}
              onToggleNiche={toggleNiche}
              onSelectProject={onSelectProject}
              onRequestCreate={onRequestCreate}
              deletingName={deletingName}
              setDeletingName={setDeletingName}
              onDeleteProject={onDeleteProject}
            />
          </div>
        </>
      )}
    </div>
  );
}