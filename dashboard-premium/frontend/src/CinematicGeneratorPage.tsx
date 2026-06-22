import React, { useState, useEffect, useRef } from "react";
import { 
  Search, Sparkles, Loader2, Copy, Check, ChevronRight, 
  BookOpen, AlertTriangle, FolderPlus, Eye, FileText,
  Castle, Church, Building2, Landmark, Home, Trees, Globe, HelpCircle,
  Video, Image as ImageIcon
} from "lucide-react";
import { ARCHITECTURES, CINEMATIC_PROMPT } from "./cinematicPrompt";

export interface ParsedPrompt {
  title: string;
  content: string;
}

export interface ParsedResult {
  context: string;
  exteriorImages: ParsedPrompt[];
  interiorImages: ParsedPrompt[];
  exteriorVideos: ParsedPrompt[];
  interiorVideos: ParsedPrompt[];
  negatives: string;
}

export function parseCinematicPrompts(text: string): ParsedResult {
  const result: ParsedResult = {
    context: "",
    exteriorImages: [],
    interiorImages: [],
    exteriorVideos: [],
    interiorVideos: [],
    negatives: ""
  };

  if (!text) return result;

  const parts = text.split(/📋\s*COPY\s+/gi);
  
  if (parts[0]) {
    result.context = parts[0].trim();
  }

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();
    const lines = part.split("\n");
    const title = lines[0].trim();
    const content = lines.slice(1).join("\n").trim();

    const parsed: ParsedPrompt = { title, content };
    const upperTitle = title.toUpperCase();
    
    if (upperTitle.includes("EXTERIOR IMAGE")) {
      result.exteriorImages.push(parsed);
    } else if (upperTitle.includes("INTERIOR IMAGE") || upperTitle.includes("SEMI-INTERIOR IMAGE") || upperTitle.includes("STRUCTURAL ACCESS IMAGE") || upperTitle.includes("STRUCTURAL-ACCESS IMAGE")) {
      result.interiorImages.push(parsed);
    } else if (upperTitle.includes("EXTERIOR VIDEO")) {
      result.exteriorVideos.push(parsed);
    } else if (upperTitle.includes("INTERIOR VIDEO") || upperTitle.includes("SEMI-INTERIOR VIDEO") || upperTitle.includes("STRUCTURAL ACCESS VIDEO") || upperTitle.includes("STRUCTURAL-ACCESS VIDEO")) {
      result.interiorVideos.push(parsed);
    } else {
      if (upperTitle.includes("NEGATIVE") || upperTitle.includes("RULES") || upperTitle.includes("REALISM") || upperTitle.includes("REGRA") || upperTitle.includes("NEGATIVO")) {
        result.negatives += `### ${title}\n${content}\n\n`;
      } else {
        result.context += `\n\n### ${title}\n${content}`;
      }
    }
  }

  if (!result.negatives) {
    const negativeIndex = text.toLowerCase().indexOf("negative prompt");
    const regraIndex = text.toLowerCase().indexOf("regras de realismo");
    const startIndex = negativeIndex !== -1 ? negativeIndex : (regraIndex !== -1 ? regraIndex : -1);
    if (startIndex !== -1) {
      result.negatives = text.slice(startIndex).trim();
    }
  }

  return result;
}

function getCategoryStyles(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes("castelo") || normalized.includes("palácio") || normalized.includes("reais")) {
    return {
      icon: Castle,
      borderColor: "hover:border-purple-500/40",
      selectedBg: "bg-purple-950/20 border-purple-500 text-purple-200 shadow-lg shadow-purple-500/10",
      badgeClass: "bg-purple-500/15 text-purple-300 border border-purple-500/20",
      idColor: "text-purple-400"
    };
  }
  if (normalized.includes("catedrais") || normalized.includes("templo") || normalized.includes("mesquita")) {
    return {
      icon: Church,
      borderColor: "hover:border-amber-500/40",
      selectedBg: "bg-amber-950/20 border-amber-500 text-amber-200 shadow-lg shadow-amber-500/10",
      badgeClass: "bg-amber-500/15 text-amber-300 border border-amber-500/20",
      idColor: "text-amber-400"
    };
  }
  if (normalized.includes("moderno") || normalized.includes("civic")) {
    return {
      icon: Building2,
      borderColor: "hover:border-sky-500/40",
      selectedBg: "bg-sky-950/20 border-sky-500 text-sky-200 shadow-lg shadow-sky-500/10",
      badgeClass: "bg-sky-500/15 text-sky-300 border border-sky-500/20",
      idColor: "text-sky-400"
    };
  }
  if (normalized.includes("landmark") || normalized.includes("famoso") || normalized.includes("monumento")) {
    return {
      icon: Landmark,
      borderColor: "hover:border-emerald-500/40",
      selectedBg: "bg-emerald-950/20 border-emerald-500 text-emerald-200 shadow-lg shadow-emerald-500/10",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
      idColor: "text-emerald-400"
    };
  }
  if (normalized.includes("residência") || normalized.includes("luxo") || normalized.includes("design")) {
    return {
      icon: Home,
      borderColor: "hover:border-rose-500/40",
      selectedBg: "bg-rose-950/20 border-rose-500 text-rose-200 shadow-lg shadow-rose-500/10",
      badgeClass: "bg-rose-500/15 text-rose-300 border border-rose-500/20",
      idColor: "text-rose-400"
    };
  }
  if (normalized.includes("rústico") || normalized.includes("tradicionais")) {
    return {
      icon: Trees,
      borderColor: "hover:border-orange-500/40",
      selectedBg: "bg-orange-950/20 border-orange-500 text-orange-200 shadow-lg shadow-orange-500/10",
      badgeClass: "bg-orange-500/15 text-orange-300 border border-orange-500/20",
      idColor: "text-orange-400"
    };
  }
  if (normalized.includes("vernacular") || normalized.includes("cultural")) {
    return {
      icon: Globe,
      borderColor: "hover:border-teal-500/40",
      selectedBg: "bg-teal-950/20 border-teal-500 text-teal-200 shadow-lg shadow-teal-500/10",
      badgeClass: "bg-teal-500/15 text-teal-300 border border-teal-500/20",
      idColor: "text-teal-400"
    };
  }
  return {
    icon: HelpCircle,
    borderColor: "hover:border-amber-500/40",
    selectedBg: "bg-amber-950/20 border-amber-500 text-amber-200 shadow-lg shadow-amber-500/10",
    badgeClass: "bg-gray-800 text-gray-400 border border-transparent",
    idColor: "text-amber-500"
  };
}

const normalizeName = (name: string) => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
};

interface CinematicGeneratorPageProps {
  geminiApiKey: string;
  geminiModel: string;
  fetchProjects: () => Promise<void>;
  BACKEND_URL: string;
  projects?: any[];
}

export default function CinematicGeneratorPage({
  geminiApiKey,
  geminiModel,
  fetchProjects,
  BACKEND_URL,
  projects = []
}: CinematicGeneratorPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedIdentity, setSelectedIdentity] = useState<typeof ARCHITECTURES[0] | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationText, setGenerationText] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"parsed" | "raw">("parsed");
  const [activePromptTab, setActivePromptTab] = useState<"context" | "ext-img" | "int-img" | "ext-vid" | "int-vid" | "neg">("context");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newMonumentoName, setNewMonumentoName] = useState("");
  const [projectTypeSelection, setProjectTypeSelection] = useState<"remotion" | "hyperframe">("remotion");
  const [isCreating, setIsCreating] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  const categories = ["Todos", ...Array.from(new Set(ARCHITECTURES.map(a => a.category)))];

  const filteredIdentities = ARCHITECTURES.filter(arch => {
    const matchesSearch = arch.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          arch.id.toString() === searchTerm.trim();
    const matchesCategory = selectedCategory === "Todos" || arch.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const generatePipeline = async () => {
    if (!selectedIdentity || isGenerating) return;

    if (!geminiApiKey) {
      alert("Por favor, configure sua chave Gemini API no chat (botão 🔑 no menu lateral) antes de gerar.");
      return;
    }

    setIsGenerating(true);
    setGenerationText("");

    try {
      const selectionModeText = ARCHITECTURES.map((arch) => `${arch.id}. ${arch.name}`).join("\n\n") + 
        "\n\nReply with a number (1–250) and I will immediately generate the full exterior and interior, semi-interior, structural-access, pool-basin, or pool-environment construction pipeline when applicable.";

      const contents = [
        {
          role: "user",
          parts: [{ text: "start" }]
        },
        {
          role: "model",
          parts: [{ text: selectionModeText }]
        },
        {
          role: "user",
          parts: [{ text: selectedIdentity.id.toString() }]
        }
      ];

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: {
              parts: [{ text: CINEMATIC_PROMPT }]
            }
          })
        }
      );

      if (res.ok) {
        const data = await res.json();
        const output = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        setGenerationText(output);
        
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        const err = await res.json();
        alert(`Erro na API do Gemini: ${err.error?.message || "Erro desconhecido"}`);
      }
    } catch (e) {
      alert("Falha de conexão com a API do Gemini. Verifique a internet e a chave configurada.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateMonumento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMonumentoName.trim() || isCreating || !generationText) return;

    setIsCreating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMonumentoName.trim(),
          prompt: generationText,
          category: selectedIdentity?.category || "",
          projectType: projectTypeSelection
        })
      });

      if (res.ok) {
        alert(`Projeto "${newMonumentoName}" (${projectTypeSelection}) criado com sucesso!`);
        setIsCreateModalOpen(false);
        setNewMonumentoName("");
        await fetchProjects();
      } else {
        const err = await res.json();
        alert(`Erro ao criar projeto: ${err.error || "Erro desconhecido"}`);
      }
    } catch (e) {
      alert("Erro ao conectar com o servidor local.");
    } finally {
      setIsCreating(false);
    }
  };

  const parsedPrompts = parseCinematicPrompts(generationText);

  useEffect(() => {
    if (selectedIdentity) {
      const baseName = selectedIdentity.name.split("—")[0].trim();
      setNewMonumentoName(baseName);
    }
  }, [selectedIdentity]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#070709] overflow-y-auto">
      
      {/* HEADER */}
      <div className="bg-gradient-to-b from-slate-950/80 to-transparent border-b border-white/5 px-8 py-6 shrink-0">
        <div className="w-full max-w-none px-4 md:px-8 mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-cinzel font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
              GERADOR DE PROMPTS VIMAX AI
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 max-w-2xl font-medium tracking-wide">
              Utilize nossa inteligência artificial para mapear e gerar storyboards detalhados de construção histórica ou moderna. Gere prompts estruturados para Remotion e Hyperframe.
            </p>
          </div>
          
          {!geminiApiKey && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Chave Gemini API Necessária (🔑 no Menu de Chat)</span>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-none px-4 md:px-12 py-8 space-y-8 flex-1">
        
        {/* GRID DE PRESETS */}
        <section className="space-y-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
            <h3 className="font-cinzel text-base font-bold text-slate-200 tracking-wider flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-500" />
              1. Selecione uma Identidade Arquitetônica (1 a 250)
            </h3>
            
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:flex-initial md:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Pesquise por nome ou número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/5 focus:border-amber-500 focus:outline-none rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 font-medium"
                />
              </div>
              
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-900/60 border border-white/5 focus:border-amber-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-slate-300 font-medium cursor-pointer"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(215px,1fr))] gap-4 max-h-[380px] overflow-y-auto pr-1">
            {filteredIdentities.map((arch) => {
              const styles = getCategoryStyles(arch.category);
              const CategoryIcon = styles.icon;
              const isSelected = selectedIdentity?.id === arch.id;

              const isDone = (projects || []).some((p: any) => {
                const normProjectName = normalizeName(p.name);
                const normArchName = normalizeName(arch.name);
                const basePart = arch.name.split(/[—–-]/)[0].trim();
                const normBasePart = normalizeName(basePart);
                return normProjectName === normArchName || normProjectName === normBasePart;
              });

              const cardClass = isSelected
                ? styles.selectedBg + " ring-1 ring-amber-500/20"
                : isDone
                  ? "bg-slate-950/20 border-white/3 text-slate-500 opacity-60 hover:opacity-100 hover:bg-slate-900/40 hover:border-slate-800"
                  : `bg-slate-900/25 border-white/5 hover:bg-slate-900/65 ${styles.borderColor} text-slate-300`;

              const iconColor = isSelected
                ? "text-amber-400"
                : isDone
                  ? "text-slate-600"
                  : styles.idColor;

              const badgeStyle = isSelected
                ? "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                : isDone
                  ? "bg-slate-950 text-slate-600 border border-white/5"
                  : styles.badgeClass;

              return (
                <button
                  key={arch.id}
                  onClick={() => {
                    setSelectedIdentity(arch);
                    setGenerationText("");
                  }}
                  className={`text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between items-stretch gap-3.5 group cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${cardClass}`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CategoryIcon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
                      <span className={`font-mono font-bold text-xs shrink-0 ${iconColor}`}>
                        #{arch.id}
                      </span>
                      {isDone && (
                        <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5 ml-1">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          OK
                        </span>
                      )}
                    </div>
                    <span className={`text-[8.5px] px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider truncate max-w-[110px] ${badgeStyle}`} title={arch.category}>
                      {arch.category}
                    </span>
                  </div>
                  <p className="font-semibold text-xs leading-relaxed text-slate-200 group-hover:text-white line-clamp-2">
                    {arch.name}
                  </p>
                </button>
              );
            })}

            {filteredIdentities.length === 0 && (
              <div className="col-span-full text-center py-12 bg-slate-950/20 border border-white/5 rounded-2xl text-slate-500 text-xs font-semibold">
                Nenhum monumento correspondente encontrado no catálogo.
              </div>
            )}
          </div>
        </section>

        {/* DETALHES SELEÇÃO E GERAÇÃO */}
        {selectedIdentity && (
          <section className="bg-slate-900/30 border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest font-mono">Monumento Selecionado</span>
              <h4 className="text-lg font-bold text-white font-cinzel tracking-wide">{selectedIdentity.name}</h4>
              <p className="text-xs text-slate-400 font-medium">Você pode gerar os prompts da linha do tempo Vimax contendo os roteiros de etapas da construção.</p>
            </div>
            
            <button 
              disabled={isGenerating || !geminiApiKey}
              onClick={generatePipeline}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs px-6 py-3.5 rounded-xl transition duration-150 cursor-pointer shadow-lg shadow-amber-500/10 flex items-center gap-2 shrink-0 w-full md:w-auto justify-center"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando Storyboard Vimax...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Gerar Prompts da Construção</span>
                </>
              )}
            </button>
          </section>
        )}

        {/* LOADING STATE */}
        {isGenerating && (
          <div className="bg-slate-900/10 border border-white/5 p-16 rounded-3xl flex flex-col items-center justify-center text-center gap-4 animate-pulse">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
              <Sparkles className="w-5 h-5 text-amber-400 absolute inset-0 m-auto" />
            </div>
            <div className="space-y-1">
              <h4 className="font-cinzel text-base font-bold text-white tracking-wide">Mapeando Linha do Tempo Visual...</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                O Gemini está gerando prompts de imagens/vídeos baseados em um workflow de construção física coerente.
              </p>
            </div>
          </div>
        )}

        {/* EXIBIÇÃO STORYBOARD GERADO */}
        {generationText && !isGenerating && (
          <div ref={resultsRef} className="space-y-6 animate-scale-up">
            
            <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-cinzel font-bold text-white tracking-wider text-xs">ROTEIRO CINEMATOGRÁFICO GERADO</h3>
              </div>

              <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                <div className="flex bg-slate-950 border border-white/5 rounded-xl p-1 shrink-0">
                  <button 
                    onClick={() => setViewMode("parsed")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      viewMode === "parsed" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Formatado (Abas)
                  </button>
                  <button 
                    onClick={() => setViewMode("raw")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      viewMode === "raw" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Bruto (Markdown)
                  </button>
                </div>

                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition flex items-center gap-1.5 shadow-lg shadow-amber-500/10 shrink-0"
                >
                  <FolderPlus className="w-4 h-4 stroke-[2.5]" />
                  Criar Projeto
                </button>
              </div>
            </div>

            {/* MODO RAW */}
            {viewMode === "raw" && (
              <div className="bg-slate-900/20 border border-white/5 p-6 rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-[10px] text-slate-400 font-mono">prompt_vimax.txt formato final</span>
                  <button 
                    onClick={() => handleCopy(generationText, "raw-all")}
                    className="text-xs text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "raw-all" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === "raw-all" ? "Copiado!" : "Copiar Roteiro Completo"}
                  </button>
                </div>
                <pre className="bg-slate-950 border border-white/5 rounded-xl p-5 text-xs text-slate-300 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap select-text max-h-[500px]">
                  {generationText}
                </pre>
              </div>
            )}

            {/* MODO PARSED */}
            {viewMode === "parsed" && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                
                <div className="lg:col-span-1 bg-slate-900/30 border border-white/5 rounded-2xl p-3 flex flex-col gap-1">
                  <button 
                    onClick={() => setActivePromptTab("context")}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                      activePromptTab === "context" ? "bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold" : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                    }`}
                  >
                    <span>Confirmação Contexto</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button 
                    onClick={() => setActivePromptTab("ext-img")}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                      activePromptTab === "ext-img" ? "bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold" : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                    }`}
                  >
                    <span>Section A: Imagens Ext ({parsedPrompts.exteriorImages.length})</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button 
                    onClick={() => setActivePromptTab("int-img")}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                      activePromptTab === "int-img" ? "bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold" : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                    }`}
                  >
                    <span>Section B: Imagens Int ({parsedPrompts.interiorImages.length})</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button 
                    onClick={() => setActivePromptTab("ext-vid")}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                      activePromptTab === "ext-vid" ? "bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold" : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                    }`}
                  >
                    <span>Section C: Vídeos Ext ({parsedPrompts.exteriorVideos.length})</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button 
                    onClick={() => setActivePromptTab("int-vid")}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                      activePromptTab === "int-vid" ? "bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold" : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                    }`}
                  >
                    <span>Section D: Vídeos Int ({parsedPrompts.interiorVideos.length})</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  <button 
                    onClick={() => setActivePromptTab("neg")}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                      activePromptTab === "neg" ? "bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold" : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                    }`}
                  >
                    <span>Regras Negativas</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                </div>

                <div className="lg:col-span-3 space-y-4">
                  
                  {activePromptTab === "context" && (
                    <div className="bg-slate-900/20 border border-white/5 p-6 rounded-2xl space-y-3">
                      <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Confirmação de Contexto</h4>
                      <p className="text-xs text-slate-300 leading-relaxed font-mono select-text bg-slate-950/80 p-4 border border-white/5 rounded-xl whitespace-pre-wrap">
                        {parsedPrompts.context || "Nenhum contexto encontrado."}
                      </p>
                    </div>
                  )}

                  {activePromptTab === "ext-img" && (
                    <div className="space-y-4">
                      {parsedPrompts.exteriorImages.map((p, idx) => (
                        <div key={idx} className="bg-slate-900/20 border border-white/5 p-5 rounded-2xl space-y-3">
                          <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest font-mono">Etapa {idx + 1} — {p.title.replace(/IMAGE PROMPT \d+ — /i, "")}</span>
                            <button 
                              onClick={() => handleCopy(p.content, `ext-img-${idx}`)}
                              className="text-xs text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              {copiedKey === `ext-img-${idx}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedKey === `ext-img-${idx}` ? "Copiado!" : "Copiar Prompt"}
                            </button>
                          </div>
                          <p className="text-xs text-slate-300 font-mono select-text leading-relaxed bg-slate-950/80 p-3.5 rounded-xl border border-white/5">{p.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {activePromptTab === "int-img" && (
                    <div className="space-y-4">
                      {parsedPrompts.interiorImages.map((p, idx) => (
                        <div key={idx} className="bg-slate-900/20 border border-white/5 p-5 rounded-2xl space-y-3">
                          <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest font-mono">Interior {idx + 1} — {p.title.replace(/IMAGE PROMPT \d+ — /i, "")}</span>
                            <button 
                              onClick={() => handleCopy(p.content, `int-img-${idx}`)}
                              className="text-xs text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              {copiedKey === `int-img-${idx}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedKey === `int-img-${idx}` ? "Copiado!" : "Copiar Prompt"}
                            </button>
                          </div>
                          <p className="text-xs text-slate-300 font-mono select-text leading-relaxed bg-slate-950/80 p-3.5 rounded-xl border border-white/5">{p.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {activePromptTab === "ext-vid" && (
                    <div className="space-y-4">
                      {parsedPrompts.exteriorVideos.map((p, idx) => (
                        <div key={idx} className="bg-slate-900/20 border border-white/5 p-5 rounded-2xl space-y-3">
                          <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest font-mono">Vídeo Ext {idx + 1} — {p.title.replace(/VIDEO PROMPT \d+ — /i, "")}</span>
                            <button 
                              onClick={() => handleCopy(p.content, `ext-vid-${idx}`)}
                              className="text-xs text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              {copiedKey === `ext-vid-${idx}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedKey === `ext-vid-${idx}` ? "Copiado!" : "Copiar Prompt"}
                            </button>
                          </div>
                          <pre className="text-xs text-slate-300 font-mono select-text whitespace-pre-wrap leading-relaxed bg-slate-950/80 p-3.5 rounded-xl border border-white/5">{p.content}</pre>
                        </div>
                      ))}
                    </div>
                  )}

                  {activePromptTab === "int-vid" && (
                    <div className="space-y-4">
                      {parsedPrompts.interiorVideos.map((p, idx) => (
                        <div key={idx} className="bg-slate-900/20 border border-white/5 p-5 rounded-2xl space-y-3">
                          <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest font-mono">Vídeo Int {idx + 1} — {p.title.replace(/VIDEO PROMPT \d+ — /i, "")}</span>
                            <button 
                              onClick={() => handleCopy(p.content, `int-vid-${idx}`)}
                              className="text-xs text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              {copiedKey === `int-vid-${idx}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedKey === `int-vid-${idx}` ? "Copiado!" : "Copiar Prompt"}
                            </button>
                          </div>
                          <pre className="text-xs text-slate-300 font-mono select-text whitespace-pre-wrap leading-relaxed bg-slate-950/80 p-3.5 rounded-xl border border-white/5">{p.content}</pre>
                        </div>
                      ))}
                    </div>
                  )}

                  {activePromptTab === "neg" && (
                    <div className="bg-slate-900/20 border border-white/5 p-6 rounded-2xl space-y-3">
                      <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Filtro Negativo / Regras do Veo</h4>
                      <div className="bg-slate-950/80 p-4 border border-white/5 rounded-xl leading-relaxed select-text text-xs text-slate-300 font-mono whitespace-pre-wrap">
                        {parsedPrompts.negatives || "Nenhum prompt negativo gerado."}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* MODAL CRIAR PROJETO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center p-4 z-50 animate-fade-in backdrop-blur-md">
          <div className="bg-slate-900 border border-white/5 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <FolderPlus className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-cinzel text-base font-bold text-white tracking-wide">Criar Novo Projeto</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Inicialize uma nova estrutura no diretório de timelapse.</p>
              </div>
            </div>

            <form onSubmit={handleCreateMonumento} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Nome do Monumento</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Japanese Minka Countryside House"
                  value={newMonumentoName}
                  onChange={(e) => setNewMonumentoName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 hover:border-slate-800 focus:border-amber-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                />
              </div>

              {/* SELEÇÃO DO TIPO DE PROJETO */}
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Tipo de Render / Tecnologia</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setProjectTypeSelection("remotion")}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition ${
                      projectTypeSelection === "remotion"
                        ? "bg-indigo-600/15 border-indigo-500 text-indigo-200"
                        : "bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200"
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span className="text-[10px] font-bold">Remotion + Vimax</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProjectTypeSelection("hyperframe")}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition ${
                      projectTypeSelection === "hyperframe"
                        ? "bg-amber-600/15 border-amber-500 text-amber-200"
                        : "bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200"
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span className="text-[10px] font-bold">Hyperframe + Vimax</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button 
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 font-bold px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isCreating}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-bold px-5 py-3 rounded-xl cursor-pointer transition flex items-center gap-1.5"
                >
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isCreating ? "Criando..." : "Criar Projeto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
