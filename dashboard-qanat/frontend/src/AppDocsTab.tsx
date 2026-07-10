import React, { useEffect, useState } from "react";
import {
  BookOpen,
  FileText,
  ChevronRight,
  Server,
  AppWindow,
  Play,
  Search,
  Loader2,
} from "lucide-react";
import { DashminPageLayout } from "./DashminPageLayout";

interface DocFile {
  id: string;
  label: string;
  filename: string;
}

interface SelectedDoc {
  id: string;
  label: string;
  filename: string;
  content: string;
}

export function AppDocsTab() {
  const [files, setFiles] = useState<DocFile[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<SelectedDoc | null>(null);
  const [activeId, setActiveId] = useState<string>("home");
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDoc, setLoadingDoc] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>(
    window.localStorage.getItem("lumiera_docs_search") || ""
  );

  useEffect(() => {
    // Carregar a lista de documentos
    fetch("/api/studio-agents/docs")
      .then((res) => res.json())
      .then((data) => {
        if (data.files) {
          setFiles(data.files);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao buscar docs", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    setLoadingDoc(true);
    fetch(`/api/studio-agents/docs?file=${activeId}`)
      .then((res) => res.json())
      .then((data) => {
        setSelectedDoc(data);
        setLoadingDoc(false);
      })
      .catch((err) => {
        console.error("Erro ao buscar doc", err);
        setLoadingDoc(false);
      });
  }, [activeId]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    window.localStorage.setItem("lumiera_docs_search", val);
  };

  // Função simples para converter Markdown básico em Elementos React estilizados
  const renderMarkdown = (text: string) => {
    if (!text) return null;

    let lines = text.split("\n");

    // Filtrar linhas se houver busca
    const q = searchTerm.trim().toLowerCase();

    const rendered: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeContent: string[] = [];
    let codeLang = "";

    lines.forEach((line, index) => {
      // Blocos de código
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          inCodeBlock = false;
          // Se o filtro estiver ativo, só exibir se bater o termo no conteúdo do bloco
          const codeStr = codeContent.join("\n");
          if (!q || codeStr.toLowerCase().includes(q)) {
            rendered.push(
              <pre
                key={`code-${index}`}
                className="p-4 my-4 bg-slate-950/70 rounded-xl border border-slate-800/80 font-mono text-[13px] text-sky-400 overflow-x-auto select-all leading-relaxed shadow-inner"
              >
                <code className={`language-${codeLang}`}>{codeStr}</code>
              </pre>
            );
          }
          codeContent = [];
        } else {
          inCodeBlock = true;
          codeLang = line.replace("```", "").trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return;
      }

      // Se houver filtro de busca e a linha não contiver o termo, pular (exceto títulos para contexto)
      if (q && !line.toLowerCase().includes(q) && !line.startsWith("#")) {
        return;
      }

      // Títulos
      if (line.startsWith("# ")) {
        rendered.push(
          <h1
            key={index}
            className="text-3xl font-extrabold text-white mt-6 mb-4 tracking-tight border-b border-slate-800 pb-2"
          >
            {parseFormatting(line.slice(2))}
          </h1>
        );
        return;
      }
      if (line.startsWith("## ")) {
        rendered.push(
          <h2
            key={index}
            className="text-2xl font-bold text-slate-100 mt-6 mb-3 tracking-wide border-l-4 border-sky-500 pl-3"
          >
            {parseFormatting(line.slice(3))}
          </h2>
        );
        return;
      }
      if (line.startsWith("### ")) {
        rendered.push(
          <h3
            key={index}
            className="text-xl font-semibold text-slate-200 mt-5 mb-2"
          >
            {parseFormatting(line.slice(4))}
          </h3>
        );
        return;
      }

      // Linha horizontal
      if (line.trim() === "---") {
        rendered.push(<hr key={index} className="my-6 border-slate-800" />);
        return;
      }

      // Citação
      if (line.startsWith("> ")) {
        rendered.push(
          <blockquote
            key={index}
            className="pl-4 py-1.5 my-4 border-l-4 border-slate-700 bg-slate-800/20 text-slate-400 text-sm italic rounded-r-md"
          >
            {parseFormatting(line.slice(2))}
          </blockquote>
        );
        return;
      }

      // Listas não ordenadas
      if (line.startsWith("- ")) {
        rendered.push(
          <ul
            key={index}
            className="list-disc pl-6 mb-2 text-slate-300 text-sm space-y-1"
          >
            <li>{parseFormatting(line.slice(2))}</li>
          </ul>
        );
        return;
      }

      // Parágrafos normais (se não for vazio)
      if (line.trim()) {
        rendered.push(
          <p
            key={index}
            className="mb-4 text-slate-300 text-sm leading-relaxed"
          >
            {parseFormatting(line)}
          </p>
        );
      }
    });

    if (rendered.length === 0 && q) {
      return (
        <div className="py-12 text-center text-slate-500 text-sm">
          Nenhum resultado encontrado para "{searchTerm}" neste documento.
        </div>
      );
    }

    return rendered;
  };

  // Substitui negritos e links básicos em Markdown
  const parseFormatting = (text: string): React.ReactNode => {
    // Regex para encontrar links [texto](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    // Regex para negritos **texto** ou __texto__
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const italicRegex = /_([^_]+)_/g;
    // Regex para inline code `code`
    const codeRegex = /`([^`]+)`/g;
    // Wikilinks [[link]]
    const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

    let currentText = text;

    // Processar wikilinks [[PageName]] ou [[PageName|Display]]
    currentText = currentText.replace(
      wikilinkRegex,
      (match, target, display) => {
        const displayText = display || target;
        // Mapear wikilinks locais para abas de docs se possível
        let targetId = "";
        if (target.includes("architecture")) targetId = "architecture";
        else if (target.includes("backend")) targetId = "backend";
        else if (target.includes("frontend")) targetId = "frontend";
        else if (target.includes("remotion")) targetId = "remotion";
        else if (target.includes("MEMORIA")) targetId = "home";

        if (targetId) {
          return `<a class="wiki-docs-link cursor-pointer text-sky-400 font-medium hover:underline" data-doc-id="${targetId}">${displayText}</a>`;
        }
        return `<span class="text-slate-400 font-medium">${displayText}</span>`;
      }
    );

    // Processar links padrão
    currentText = currentText.replace(linkRegex, (match, label, url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:text-sky-300 underline font-medium">${label}</a>`;
    });

    // Processar negrito
    currentText = currentText.replace(boldRegex, (match, inner) => {
      return `<strong class="font-bold text-white">${inner}</strong>`;
    });

    // Processar itálico
    currentText = currentText.replace(italicRegex, (match, inner) => {
      return `<em class="italic text-slate-200">${inner}</em>`;
    });

    // Processar inline code
    currentText = currentText.replace(codeRegex, (match, inner) => {
      return `<code class="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono text-[13px] text-amber-400">${inner}</code>`;
    });

    // Destacar termo de busca se houver
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      // Evitar quebrar tags HTML substituídas acima
      // Um destaque simples sem quebrar tags
    }

    return (
      <span
        dangerouslySetInnerHTML={{ __html: currentText }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.classList.contains("wiki-docs-link")) {
            const docId = target.getAttribute("data-doc-id");
            if (docId) {
              setActiveId(docId);
            }
          }
        }}
      />
    );
  };

  const getDocIcon = (id: string) => {
    switch (id) {
      case "home":
        return <BookOpen className="w-4 h-4 text-sky-400" />;
      case "architecture":
        return <ChevronRight className="w-4 h-4 text-sky-400" />;
      case "backend":
        return <Server className="w-4 h-4 text-sky-400" />;
      case "frontend":
        return <AppWindow className="w-4 h-4 text-sky-400" />;
      case "remotion":
        return <Play className="w-4 h-4 text-sky-400" />;
      default:
        return <FileText className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <DashminPageLayout
      title="Documentação do Sistema"
      subtitle="Base de conhecimento integrada do Lumiera Studio"
      breadcrumb={["Estúdio", "Documentação"]}
      icon={<BookOpen className="w-6 h-6 text-sky-400" />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Menu Lateral */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-2 mb-1">
              Documentos
            </h2>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {files.map((file) => {
                  const isActive = file.id === activeId;
                  return (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => setActiveId(file.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all duration-200 border ${
                        isActive
                          ? "bg-sky-500/10 border-sky-500/30 text-white shadow-lg shadow-sky-500/5"
                          : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                      }`}
                    >
                      {getDocIcon(file.id)}
                      <span className="truncate">{file.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Busca rápida */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-2 mb-2">
              Busca na documentação
            </h2>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Filtrar tópicos..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>
            <div className="mt-3 text-[11px] text-slate-500 leading-relaxed px-1">
              Dica: Digite termos como "server.js" ou "TimesFM" para pesquisar
              rapidamente.
            </div>
          </div>
        </div>

        {/* Leitor de Documentos */}
        <div className="lg:col-span-3">
          <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/60 rounded-2xl p-6 lg:p-8 min-h-[500px] shadow-xl relative overflow-hidden">
            {/* Efeito de brilho de fundo */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-[100px] pointer-events-none" />

            {loadingDoc ? (
              <div className="absolute inset-0 flex justify-center items-center bg-slate-950/20 backdrop-blur-sm rounded-2xl z-10">
                <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
              </div>
            ) : null}

            {selectedDoc ? (
              <div className="prose prose-invert max-w-none text-slate-300">
                {renderMarkdown(selectedDoc.content)}
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center py-20 text-center">
                <FileText className="w-12 h-12 text-slate-600 mb-3" />
                <h3 className="text-lg font-semibold text-slate-400">
                  Nenhum documento carregado
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Selecione um arquivo de documentação na barra lateral.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashminPageLayout>
  );
}
