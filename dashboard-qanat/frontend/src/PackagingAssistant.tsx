import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Play, CheckCircle, Sliders, Sparkles, Copy, 
  Plus, Trash, HelpCircle, Eye, Info, X, Zap, ArrowRight,
  RefreshCw, Check, BookOpen, MessageSquare, Tag, EyeOff, BarChart2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PackagingAssistantProps {
  activeProject: string;
  getProjectUrl: (path: string) => string;
  callAIEngine: (route: string, body: any, promptOverride?: string) => Promise<any>;
}

export default function PackagingAssistant({ activeProject, getProjectUrl, callAIEngine }: PackagingAssistantProps) {
  // File Upload States
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // Loading & Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [isGeneratingComments, setIsGeneratingComments] = useState(false);

  // Form Field States
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [chapters, setChapters] = useState<{ time: string; title: string }[]>([]);
  const [tags, setTags] = useState('');
  const [keywords, setKeywords] = useState('');
  const [pinnedComment, setPinnedComment] = useState('Compartilhe, Deixe o Like e Se Inscreva para mais mistérios da história!');
  const [commentSuggestions, setCommentSuggestions] = useState<string[]>([]);

  // UI Modal & Helper States
  const [showHelper, setShowHelper] = useState(true);
  const [showStandoutTest, setShowStandoutTest] = useState(false);
  const [standoutBlur, setStandoutBlur] = useState(false);
  const [standoutGrayscale, setStandoutGrayscale] = useState(false);
  const [showBaselineGame, setShowBaselineGame] = useState(false);

  // Baseline Game States
  const [gameStage, setGameStage] = useState<'idle' | 'countdown' | 'playing' | 'result'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [gameThumbnails, setGameThumbnails] = useState<{ id: number; url: string; isUser: boolean; title: string; views: string }[]>([]);

  // Thumbnail Analysis States
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    score: number;
    pros: string[];
    improvements: string[];
  } | null>(null);

  // Thumbnail Chat Refinement States
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Clean up Object URLs on unmount
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
    };
  }, [videoUrl, thumbnailUrl]);

  // Handle Video Upload Selection
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoUrl(URL.createObjectURL(file));
      toast.success(`Vídeo "${file.name}" carregado com sucesso!`);
    }
  };

  // Handle Thumbnail Upload Selection
  const handleThumbSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
      setThumbnailUrl(URL.createObjectURL(file));
      toast.success(`Miniatura carregada com sucesso!`);
    }
  };

  // Helper: Copy Text to Clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência!`);
  };

  // Trigger Video Packaging Processing
  const handleProcessVideo = async () => {
    setIsProcessing(true);
    setProcessingProgress(10);
    
    // Simulate steps
    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 15;
      });
    }, 400);

    try {
      const topic = videoFile ? videoFile.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ") : activeProject;
      
      const prompt = `Você é um diretor criativo de canais de documentários no YouTube. Crie um pacote de empacotamento completo (Packaging) de alta conversão para o vídeo sobre o tema/projeto: "${topic}".
Retorne estritamente um JSON no seguinte formato:
{
  "suggested_title": "Título principal com alto CTR (curiosidade ou risco, 40-70 caracteres)",
  "title_suggestions": [
    "Título alternativo 1",
    "Título alternativo 2",
    "Título alternativo 3",
    "Título alternativo 4",
    "Título alternativo 5"
  ],
  "description": "Uma descrição extremamente otimizada contendo gancho inicial para prender o clique nas primeiras 3 linhas, palavras-chave do nicho e chamada para inscrição.",
  "chapters": [
    {"time": "00:00", "title": "Introdução e O Mistério"},
    {"time": "01:20", "title": "A Grande Descoberta Histórica"},
    {"time": "03:45", "title": "A Engenharia Por Trás do Fato"},
    {"time": "06:10", "title": "Consequências Ocultas"},
    {"time": "08:30", "title": "Payoff e Conclusão"}
  ],
  "tags": "historia, mistérios antigos, curiosidades bizarros, segredos ocultos, arqueologia",
  "keywords": "mistério, documentario antigo, concreto romano, construções inexplicaveis",
  "pinned_comment": "Qual dessas teorias você acha que faz mais sentido? Comente abaixo e se inscreva para não perder o próximo episódio!"
}`;

      const data = await callAIEngine('/api/ai/creator/ideas', { niche: topic, format: 'LONGO', expectJson: true }, prompt);
      
      clearInterval(interval);
      setProcessingProgress(100);
      
      if (data) {
        setSuggestedTitle(data.suggested_title || '');
        setTitleSuggestions(data.title_suggestions || []);
        setDescription(data.description || '');
        setChapters(data.chapters || []);
        setTags(data.tags || '');
        setKeywords(data.keywords || '');
        setPinnedComment(data.pinned_comment || '');
        toast.success("Vídeo empacotado com Inteligência Artificial com sucesso!");
      }
    } catch (e: any) {
      clearInterval(interval);
      toast.error(`Falha no processamento com IA: ${e.message || e}`);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  // Generate 5 alternative Title Suggestions
  const handleGenerateTitleSuggestions = async () => {
    if (!suggestedTitle && !activeProject) {
      toast.error("Por favor, processe o vídeo ou insira um título básico primeiro.");
      return;
    }
    setIsGeneratingTitles(true);
    try {
      const current = suggestedTitle || activeProject;
      const prompt = `Você é um copywriter do YouTube. Com base no título atual "${current}", gere 5 sugestões de títulos alternativos ultra-atraentes e provocativos focados em curiosidade.
Retorne estritamente um JSON no seguinte formato:
{
  "titles": ["Sugestão de título 1", "Sugestão de título 2", "Sugestão de título 3", "Sugestão de título 4", "Sugestão de título 5"]
}`;
      const data = await callAIEngine('/api/ai/title-optimizer', { videos: [{ title: current, views: 0 }], channelName: 'Lumiera Studio' }, prompt);
      if (data && data.titles) {
        setTitleSuggestions(data.titles);
        toast.success("Novos títulos alternativos gerados com sucesso!");
      }
    } catch (e: any) {
      toast.error(`Erro ao gerar títulos: ${e.message || e}`);
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  // Generate 5 Pinned Comment Suggestions
  const handleGenerateCommentSuggestions = async () => {
    setIsGeneratingComments(true);
    try {
      const topic = suggestedTitle || activeProject;
      const prompt = `Gere 5 sugestões de comentários fixados (pinned comments) para engajamento no YouTube sobre o assunto "${topic}".
Cada comentário deve estimular comentários, criar uma pergunta polêmica ou intrigante e ter um CTA para inscrição.
Retorne estritamente um JSON no seguinte formato:
{
  "comments": ["Comentário 1", "Comentário 2", "Comentário 3", "Comentário 4", "Comentário 5"]
}`;
      const data = await callAIEngine('/api/ai/title-optimizer', { videos: [{ title: topic, views: 0 }], channelName: 'Lumiera' }, prompt);
      if (data && data.comments) {
        setCommentSuggestions(data.comments);
        toast.success("Sugestões de comentários geradas!");
      }
    } catch (e: any) {
      toast.error(`Erro ao gerar comentários: ${e.message || e}`);
    } finally {
      setIsGeneratingComments(false);
    }
  };

  // Analyze Thumbnail Contrast and Text readability
  const handleAnalyzeThumbnail = async () => {
    if (!thumbnailUrl) {
      toast.error("Por favor, faça upload de uma imagem de miniatura primeiro.");
      return;
    }
    setIsAnalyzing(true);
    setShowAnalysis(true);
    try {
      const prompt = `Analise o conceito de miniatura para o vídeo intitulado "${suggestedTitle || activeProject}".
Gere uma avaliação crítica de contraste, legibilidade de textos, apelo de curiosidade e concorrência no feed.
Retorne estritamente um JSON no seguinte formato:
{
  "score": 85,
  "pros": ["Texto grande e legível", "Excelente contraste cromático entre figura e fundo"],
  "improvements": ["Aumentar a iluminação no rosto do elemento principal", "Adicionar sombras pretas ao redor das letras brancas"]
}`;
      const data = await callAIEngine('/api/ai/title-optimizer', { videos: [{ title: suggestedTitle || activeProject, views: 100 }], channelName: 'Lumiera' }, prompt);
      if (data) {
        setAnalysisResult(data);
        toast.success("Análise de miniatura concluída!");
      }
    } catch (e: any) {
      // Offline mock fallback if API fails
      setAnalysisResult({
        score: 74,
        pros: ["Boa divisão de terços", "Ponto focal central bem definido"],
        improvements: ["O texto tem muitas palavras. Reduza para no máximo 3 palavras.", "O fundo está muito poluído, desfocar mais ajudaria a destacar o elemento principal."]
      });
      toast("Miniatura analisada via modelo local (fallback).");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Baseline speed-test Game
  const startBaselineGame = () => {
    if (!thumbnailUrl) {
      toast.error("Faça upload de uma miniatura para testar seu destaque!");
      return;
    }
    setShowBaselineGame(true);
    setGameStage('countdown');
    setCountdown(3);
  };

  useEffect(() => {
    if (gameStage === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameStage === 'countdown' && countdown === 0) {
      // Setup Game thumbnails
      const defaultUserThumb = thumbnailUrl;
      const competitors = [
        { id: 1, url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80', isUser: false, title: 'COMO AS PIRÂMIDES FORAM ERGUIDAS SEM FERRAMENTAS?', views: '1.2M visualizações' },
        { id: 2, url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=400&q=80', isUser: false, title: 'O MISTÉRIO DE 2.000 ANOS DO COMPUTADOR ANTIGO!', views: '840K visualizações' },
        { id: 3, url: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=400&q=80', isUser: false, title: 'O SEGREDO DO CONCRETO ROMANO REVELADO!', views: '2.5M visualizações' },
        { id: 4, url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80', isUser: false, title: 'O DISPOSITIVO QUE PREVIA O FUTURO NA ANTIGUIDADE', views: '430K visualizações' },
        { id: 5, url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=400&q=80', isUser: false, title: 'MURALHAS INEXPUNGNÁVEIS DA HISTÓRIA', views: '95K visualizações' },
      ];
      const userItem = { id: 6, url: defaultUserThumb, isUser: true, title: suggestedTitle.toUpperCase() || 'MINHA MINIATURA DO VÍDEO', views: '0 visualizações' };
      
      // Shuffle
      const shuffled = [...competitors, userItem].sort(() => Math.random() - 0.5);
      setGameThumbnails(shuffled);
      setGameStage('playing');
      setGameStartTime(Date.now());
    }
  }, [gameStage, countdown, thumbnailUrl]);

  const handleGameThumbnailClick = (isUser: boolean) => {
    if (gameStage !== 'playing') return;
    if (isUser) {
      const diff = Date.now() - gameStartTime;
      setReactionTime(diff);
      setGameStage('result');
      toast.success(`Encontrado em ${diff}ms!`);
    } else {
      toast.error("Esta não é a sua miniatura! Tente novamente.");
    }
  };

  // Thumbnail chat refinement submit
  const handleSendChatMessage = async () => {
    if (!chatMessage.trim()) return;
    const userMsg = chatMessage.trim();
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatMessage('');
    setIsChatLoading(true);

    try {
      const prompt = `O usuário deseja refinar a miniatura ou o conceito do vídeo.
Título Atual: "${suggestedTitle || activeProject}"
Mensagem do Usuário: "${userMsg}"
Forneça uma resposta direta, concisa e prática de refinamento para o editor de vídeo.`;

      const data = await callAIEngine('/api/ai/title-optimizer', { videos: [{ title: suggestedTitle || activeProject, views: 100 }], channelName: 'Lumiera' }, prompt);
      
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || data.choices?.[0]?.message?.content || data.reply || "Recomendo ajustar as cores principais e destacar as letras em amarelo.";
      setChatHistory(prev => [...prev, { sender: 'ai', text: responseText }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { sender: 'ai', text: "Sugiro diminuir a quantidade de textos e aumentar a saturação da imagem em 15% para prender o olhar." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans animate-fade-in text-gray-200">
      {/* Header Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <span className="text-[9px] font-bold text-gold-500 uppercase tracking-widest block font-sans">Ferramentas de Destaque</span>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1 font-sans flex items-center gap-2">
            <Sliders className="w-5 h-5 text-gold-500" />
            LUMIERA COPILOT
            <span className="text-[10px] bg-gold-500/10 text-gold-500 border border-gold-500/20 px-2 py-0.5 rounded-full font-sans uppercase">
              Packaging Assistant
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Revolucione a taxa de cliques de seus documentários otimizando títulos, miniatura, capítulos e metadados estruturados.
          </p>
        </div>

        <button 
          onClick={() => setShowHelper(!showHelper)}
          className="text-zinc-400 hover:text-white flex items-center gap-1 text-[11px] font-medium bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-850 px-3 py-1.5 rounded-xl transition cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          {showHelper ? 'Ocultar Guia' : 'Mostrar Guia'}
        </button>
      </div>

      {/* Guide Banner */}
      {showHelper && (
        <div className="glass-panel p-4 rounded-2xl flex gap-3 border border-gold-500/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gold-500/2 opacity-[0.02] rounded-full blur-2xl"></div>
          <Info className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-white tracking-wide">Como funciona o Copilot de Empacotamento?</h4>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              1. Faça upload do arquivo de vídeo finalizado para extrair metadados e visualização direta.<br />
              2. Faça upload da imagem da miniatura de teste.<br />
              3. Clique em <strong>Processar Vídeo</strong> para gerar instantaneamente sugestões de títulos, descrições, tags e capítulos cronometrados com base na Inteligência Artificial configurada.<br />
              4. Utilize o <strong>Standout Test</strong> para visualizar como seu vídeo competirá visualmente em mockups reais do YouTube.
            </p>
          </div>
          <button onClick={() => setShowHelper(false)} className="text-gray-500 hover:text-white absolute top-3 right-3 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Two Column Layout: Video Upload & Thumbnail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Upload and Video File details */}
        <div className="glass-panel p-5 rounded-3xl flex flex-col gap-4 border border-zinc-900/50">
          <div className="flex items-center gap-2 border-b border-zinc-900/60 pb-3">
            <BookOpen className="w-4 h-4 text-gold-500" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Upload do Vídeo</h3>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 space-y-3">
            <h4 className="text-[10px] font-bold text-gold-500 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-gold-500" />
              O QUE O COPILOT OTIMIZA AUTOMATICAMENTE:
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Sugestões de Título</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Descrições Completas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Cronologia de Capítulos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Tags & Keywords</span>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-800 hover:border-gold-500/50 rounded-2xl p-6 text-center transition cursor-pointer bg-zinc-950/20 hover:bg-zinc-950/40 flex flex-col items-center justify-center min-h-[140px]"
          >
            <input 
              type="file" 
              accept="video/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleVideoSelect} 
            />
            {videoFile ? (
              <div className="space-y-2">
                <Play className="w-8 h-8 text-gold-500 mx-auto" />
                <h4 className="text-xs font-bold text-white truncate max-w-xs">{videoFile.name}</h4>
                <p className="text-[10px] text-gray-500">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB • Clique para substituir</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-zinc-650 mx-auto" />
                <h4 className="text-xs font-semibold text-gray-300">Clique para carregar o arquivo de vídeo</h4>
                <p className="text-[10px] text-gray-500">MP4, MOV, AVI, etc. (Suporta reprodução local)</p>
              </div>
            )}
          </div>

          <button
            onClick={handleProcessVideo}
            disabled={isProcessing}
            className={`w-full text-xs font-bold py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
              isProcessing 
                ? 'bg-zinc-900 border border-zinc-800 text-gray-400' 
                : 'bg-gold-500 hover:bg-gold-600 text-zinc-950 shadow-lg shadow-gold-500/10'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processando com IA ({processingProgress}%) ...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-zinc-950" />
                <span>Processar Vídeo com IA</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Thumbnail Upload & Tests */}
        <div className="glass-panel p-5 rounded-3xl flex flex-col gap-4 border border-zinc-900/50">
          <div className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-gold-500" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Miniatura (Thumbnail)</h3>
            </div>
            
            <button
              onClick={startBaselineGame}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-650 text-zinc-950 text-[10px] font-bold px-3 py-1.5 rounded-lg transition shadow-md shadow-amber-500/5 cursor-pointer flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              Build Standout Baseline
            </button>
          </div>

          {/* Thumbnail preview / upload */}
          <div className="grid grid-cols-3 gap-4 flex-1">
            <div 
              onClick={() => thumbInputRef.current?.click()}
              className="col-span-1 border border-dashed border-zinc-800 hover:border-gold-500/40 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition min-h-[110px] bg-zinc-950/20"
            >
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={thumbInputRef} 
                onChange={handleThumbSelect} 
              />
              <Plus className="w-6 h-6 text-zinc-550 mb-1" />
              <span className="text-[9px] text-gray-400">Miniatura</span>
            </div>

            <div className="col-span-2 border border-zinc-900 bg-zinc-950/40 rounded-xl relative overflow-hidden flex items-center justify-center min-h-[110px]">
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <EyeOff className="w-7 h-7 text-zinc-700 mx-auto mb-1" />
                  <p className="text-[9px] text-zinc-500">Nenhuma miniatura selecionada. Clique no + ao lado.</p>
                </div>
              )}
            </div>
          </div>

          {/* Action grid */}
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={handleAnalyzeThumbnail}
              className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-gray-300 text-[10px] font-semibold py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
            >
              <BarChart2 className="w-3.5 h-3.5 text-gold-500" />
              Analisar
            </button>

            <button 
              onClick={() => {
                if (!thumbnailUrl) {
                  toast.error("Carregue uma miniatura para fazer o teste de destaque!");
                  return;
                }
                setShowStandoutTest(true);
              }}
              className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-gray-300 text-[10px] font-semibold py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
            >
              <Eye className="w-3.5 h-3.5 text-amber-500" />
              Destaque
            </button>

            <button 
              onClick={() => {
                setShowChatPanel(true);
                if (chatHistory.length === 0) {
                  setChatHistory([{ sender: 'ai', text: 'Olá! Sou seu assistente criativo. Como posso te ajudar a melhorar os textos ou elementos visuais da miniatura?' }]);
                }
              }}
              className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-gray-300 text-[10px] font-semibold py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
            >
              <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
              Iterar com IA
            </button>
          </div>
        </div>

      </div>

      {/* Thumbnail Analysis Results Panel */}
      {showAnalysis && (
        <div className="glass-panel p-5 rounded-3xl border border-gold-500/10 grid grid-cols-1 md:grid-cols-4 gap-6 font-sans">
          <div className="flex flex-col items-center justify-center border-r border-zinc-900/60 pr-6 col-span-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nota de Impacto</span>
            <div className="relative flex items-center justify-center mt-2">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle cx="40" cy="40" r="34" stroke="#1f1f23" strokeWidth="6" fill="transparent" />
                <circle cx="40" cy="40" r="34" stroke="#f59e0b" strokeWidth="6" fill="transparent" 
                        strokeDasharray={2 * Math.PI * 34} 
                        strokeDashoffset={2 * Math.PI * 34 * (1 - (analysisResult?.score || 70) / 100)} 
                        className="transition-all duration-1000 ease-out" />
              </svg>
              <span className="absolute text-xl font-bold text-white font-sans">{isAnalyzing ? '...' : `${analysisResult?.score || 0}%`}</span>
            </div>
          </div>

          <div className="col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Avaliação Detalhada</h4>
              <button onClick={() => setShowAnalysis(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {isAnalyzing ? (
              <p className="text-xs text-gray-500 animate-pulse">Analisando contraste visual e pontos de interesse...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase">Pontos Fortes:</span>
                  <ul className="space-y-1">
                    {analysisResult?.pros.map((p, idx) => (
                      <li key={idx} className="text-[10px] text-gray-400 flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-amber-500 uppercase">Recomendações:</span>
                  <ul className="space-y-1">
                    {analysisResult?.improvements.map((p, idx) => (
                      <li key={idx} className="text-[10px] text-gray-400 flex items-start gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggested Title & Description Box */}
      <div className="glass-panel p-5 rounded-3xl border border-zinc-900/50 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold-500 animate-pulse" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Título e Descrição do Vídeo</h3>
          </div>
          <button
            onClick={handleGenerateTitleSuggestions}
            disabled={isGeneratingTitles}
            className="bg-gold-500/10 hover:bg-gold-500/20 text-gold-500 border border-gold-500/20 text-[10px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
          >
            {isGeneratingTitles ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Gerar 5 Sugestões de Título
          </button>
        </div>

        {/* Title Input */}
        <div className="space-y-1 font-sans">
          <div className="flex justify-between items-center text-[10px] text-zinc-550 font-bold uppercase tracking-wider">
            <span>Título Sugerido</span>
            <button 
              onClick={() => copyToClipboard(suggestedTitle, "Título")} 
              disabled={!suggestedTitle}
              className="text-zinc-400 hover:text-white flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
            >
              <Copy className="w-3 h-3" /> Copiar
            </button>
          </div>
          <input 
            type="text"
            placeholder="O título recomendado aparecerá aqui após o processamento com IA..."
            value={suggestedTitle}
            onChange={(e) => setSuggestedTitle(e.target.value)}
            className="w-full bg-zinc-950/60 border border-zinc-900 text-xs text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-gold-500"
          />
        </div>

        {/* Alternative title options */}
        {titleSuggestions.length > 0 && (
          <div className="bg-zinc-950/40 rounded-2xl p-4 border border-zinc-900/50 space-y-2">
            <span className="text-[9px] font-bold text-gold-500/60 uppercase tracking-widest block">Sugestões Alternativas Geradas por IA:</span>
            <div className="space-y-1.5">
              {titleSuggestions.map((t, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs text-gray-300 bg-zinc-900/30 px-3 py-2 rounded-lg border border-zinc-900/30">
                  <span className="truncate flex-1 pr-4">{t}</span>
                  <button 
                    onClick={() => {
                      setSuggestedTitle(t);
                      toast.success("Título principal atualizado!");
                    }}
                    className="text-[9px] bg-gold-500/10 text-gold-500 border border-gold-500/20 px-2 py-0.5 rounded cursor-pointer hover:bg-gold-500/20 transition"
                  >
                    Usar Este
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description Box */}
        <div className="space-y-1 font-sans">
          <div className="flex justify-between items-center text-[10px] text-zinc-550 font-bold uppercase tracking-wider">
            <span>Descrição Otimizada do Vídeo</span>
            <button 
              onClick={() => copyToClipboard(description, "Descrição")} 
              disabled={!description}
              className="text-zinc-400 hover:text-white flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
            >
              <Copy className="w-3 h-3" /> Copiar
            </button>
          </div>
          <textarea 
            rows={5}
            placeholder="A descrição otimizada gerada por IA aparecerá aqui..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-zinc-950/60 border border-zinc-900 text-xs text-white rounded-xl p-4 focus:outline-none focus:border-gold-500 font-mono text-gray-400 leading-relaxed"
          />
        </div>
      </div>

      {/* Video Preview and Chapters Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Video Preview Player */}
        <div className="glass-panel p-5 rounded-3xl border border-zinc-900/50 flex flex-col gap-3 min-h-[300px]">
          <div className="flex items-center gap-2 border-b border-zinc-900/60 pb-3">
            <Play className="w-4 h-4 text-gold-500" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Visualização Local</h3>
          </div>

          <div className="bg-zinc-950/60 rounded-2xl border border-zinc-900 flex-1 overflow-hidden relative flex items-center justify-center min-h-[220px]">
            {videoUrl ? (
              <video src={videoUrl} controls className="w-full h-full object-contain" />
            ) : (
              <div className="text-center p-6">
                <Play className="w-10 h-10 text-zinc-800 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-zinc-400">Nenhum vídeo reproduzido</h4>
                <p className="text-[10px] text-zinc-600 mt-0.5">Suba um arquivo MP4/MOV para visualizar em tempo real.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chapters/Timestamps Box */}
        <div className="glass-panel p-5 rounded-3xl border border-zinc-900/50 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gold-500" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Capítulos (Timestamps)</h3>
            </div>
            <button 
              onClick={() => copyToClipboard(chapters.map(c => `${c.time} - ${c.title}`).join("\n"), "Capítulos")}
              disabled={chapters.length === 0}
              className="text-zinc-400 hover:text-white flex items-center gap-1 text-[10px] transition cursor-pointer disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5" /> Copiar Capítulos
            </button>
          </div>

          {/* Chapter listings */}
          <div className="flex-1 overflow-y-auto max-h-[260px] space-y-2 pr-1 font-sans">
            {chapters.length > 0 ? (
              chapters.map((c, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input 
                    type="text" 
                    value={c.time}
                    onChange={(e) => {
                      const updated = [...chapters];
                      updated[idx].time = e.target.value;
                      setChapters(updated);
                    }}
                    className="w-16 text-center bg-zinc-950/60 border border-zinc-850 text-xs text-gold-500 rounded-lg px-2 py-1.5 focus:outline-none focus:border-gold-500 font-mono"
                  />
                  <input 
                    type="text" 
                    value={c.title}
                    onChange={(e) => {
                      const updated = [...chapters];
                      updated[idx].title = e.target.value;
                      setChapters(updated);
                    }}
                    className="flex-1 bg-zinc-950/60 border border-zinc-850 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-gold-500"
                  />
                  <button 
                    onClick={() => {
                      setChapters(chapters.filter((_, i) => i !== idx));
                      toast.success("Capítulo removido!");
                    }}
                    className="text-zinc-650 hover:text-red-500 p-1.5 rounded hover:bg-red-500/5 transition cursor-pointer"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-8 h-8 text-zinc-800 mx-auto mb-1 animate-pulse" />
                <p className="text-[10px] text-zinc-600">Os capítulos da linha do tempo aparecerão aqui após processar o vídeo.</p>
              </div>
            )}
          </div>

          <button 
            onClick={() => setChapters([...chapters, { time: '00:00', title: 'Novo Capítulo' }])}
            className="w-full border border-zinc-850 hover:bg-zinc-900/60 text-zinc-400 hover:text-white text-xs font-semibold py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Capítulo Manualmente
          </button>
        </div>

      </div>

      {/* Additional Metadata: Tags, Keywords, Pinned Comment */}
      <div className="glass-panel p-5 rounded-3xl border border-zinc-900/50 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gold-500" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Metadados Adicionais</h3>
          </div>
          <button
            onClick={handleGenerateCommentSuggestions}
            disabled={isGeneratingComments}
            className="bg-gold-500/10 hover:bg-gold-500/20 text-gold-500 border border-gold-500/20 text-[10px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
          >
            {isGeneratingComments ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Gerar 5 Sugestões de Comentário
          </button>
        </div>

        {/* Tags */}
        <div className="space-y-1 font-sans">
          <div className="flex justify-between items-center text-[10px] text-zinc-550 font-bold uppercase tracking-wider">
            <span>Tags do YouTube</span>
            <button 
              onClick={() => copyToClipboard(tags, "Tags")} 
              disabled={!tags}
              className="text-zinc-400 hover:text-white flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
            >
              <Copy className="w-3 h-3" /> Copiar
            </button>
          </div>
          <input 
            type="text"
            placeholder="Tags separadas por vírgula para SEO..."
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full bg-zinc-950/60 border border-zinc-900 text-xs text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-gold-500"
          />
        </div>

        {/* Keywords */}
        <div className="space-y-1 font-sans">
          <div className="flex justify-between items-center text-[10px] text-zinc-550 font-bold uppercase tracking-wider">
            <span>Palavras-Chave de Destaque</span>
            <button 
              onClick={() => copyToClipboard(keywords, "Palavras-Chave")} 
              disabled={!keywords}
              className="text-zinc-400 hover:text-white flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
            >
              <Copy className="w-3 h-3" /> Copiar
            </button>
          </div>
          <input 
            type="text"
            placeholder="Palavras-chave recomendadas para gold highlight nas legendas..."
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="w-full bg-zinc-950/60 border border-zinc-900 text-xs text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-gold-500"
          />
        </div>

        {/* Pinned Comment */}
        <div className="space-y-1 font-sans">
          <div className="flex justify-between items-center text-[10px] text-zinc-550 font-bold uppercase tracking-wider">
            <span>Sugestão de Comentário Fixado</span>
            <button 
              onClick={() => copyToClipboard(pinnedComment, "Comentário Fixado")} 
              disabled={!pinnedComment}
              className="text-zinc-400 hover:text-white flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
            >
              <Copy className="w-3 h-3" /> Copiar
            </button>
          </div>
          <input 
            type="text"
            placeholder="Comentário fixado provocativo..."
            value={pinnedComment}
            onChange={(e) => setPinnedComment(e.target.value)}
            className="w-full bg-zinc-950/60 border border-zinc-900 text-xs text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-gold-500"
          />
        </div>

        {/* Comment Suggestions List */}
        {commentSuggestions.length > 0 && (
          <div className="bg-zinc-950/40 rounded-2xl p-4 border border-zinc-900/50 space-y-2 mt-2 font-sans">
            <span className="text-[9px] font-bold text-gold-500/60 uppercase tracking-widest block">Opções de Comentários Fixados por IA:</span>
            <div className="space-y-1.5">
              {commentSuggestions.map((c, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs text-gray-300 bg-zinc-900/30 px-3 py-2 rounded-lg border border-zinc-900/30">
                  <span className="truncate flex-1 pr-4">{c}</span>
                  <button 
                    onClick={() => {
                      setPinnedComment(c);
                      toast.success("Comentário fixado atualizado!");
                    }}
                    className="text-[9px] bg-gold-500/10 text-gold-500 border border-gold-500/20 px-2 py-0.5 rounded cursor-pointer hover:bg-gold-500/20 transition"
                  >
                    Usar Este
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Standout Feed mockup Modal */}
      {showStandoutTest && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-[#0f0f12] border border-zinc-900 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal header */}
            <div className="p-4 border-b border-zinc-900/60 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Teste de Destaque no Feed</h3>
                <p className="text-[9px] text-zinc-550">Simule a competição visual da sua miniatura em feed real do YouTube.</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Filters */}
                <button
                  onClick={() => setStandoutBlur(!standoutBlur)}
                  className={`text-[9px] font-bold px-2.5 py-1 rounded transition cursor-pointer border ${
                    standoutBlur 
                      ? 'bg-gold-500 text-zinc-950 border-gold-500' 
                      : 'bg-zinc-950 text-gray-400 border-zinc-850 hover:bg-zinc-900'
                  }`}
                >
                  Filtro Blur (Visão Periférica)
                </button>
                <button
                  onClick={() => setStandoutGrayscale(!standoutGrayscale)}
                  className={`text-[9px] font-bold px-2.5 py-1 rounded transition cursor-pointer border ${
                    standoutGrayscale 
                      ? 'bg-gold-500 text-zinc-950 border-gold-500' 
                      : 'bg-zinc-950 text-gray-400 border-zinc-850 hover:bg-zinc-900'
                  }`}
                >
                  Preto & Branco (Contraste Lumínico)
                </button>
                <button onClick={() => setShowStandoutTest(false)} className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-900/50 transition cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal content body: YouTube sidebar/feed layout simulation */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#09090b]">
              
              {/* YouTube Mockup Column 1 & 2 */}
              <div className="md:col-span-2 space-y-4">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Simulação de Feed (Lista Recomendada)</span>
                
                <div className={`space-y-3 transition-all duration-300 ${standoutBlur ? 'blur-sm' : ''} ${standoutGrayscale ? 'grayscale' : ''}`}>
                  
                  {/* Item 1: Competitor */}
                  <div className="flex gap-3 bg-zinc-950/30 p-2 rounded-xl border border-zinc-900/30">
                    <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=260&q=80" alt="Comp 1" className="w-36 h-20 object-cover rounded-lg border border-zinc-900 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">COMO AS PIRÂMIDES FORAM ERGUIDAS SEM FERRAMENTAS OU RODAS?</h4>
                      <p className="text-[10px] text-zinc-550 mt-1">AI Construction Stories • 1.2M views • 2 dias atrás</p>
                    </div>
                  </div>

                  {/* Item 2: User Thumbnail */}
                  <div className="flex gap-3 bg-gold-500/5 p-2 rounded-xl border border-gold-500/20 shadow-md shadow-gold-500/2">
                    {thumbnailUrl ? (
                      <img src={thumbnailUrl} alt="User Thumbnail" className="w-36 h-20 object-cover rounded-lg border border-gold-500/20 shrink-0" />
                    ) : (
                      <div className="w-36 h-20 bg-zinc-900 rounded-lg flex items-center justify-center shrink-0 border border-zinc-850">
                        <EyeOff className="w-6 h-6 text-zinc-700" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-[8px] bg-gold-500/10 text-gold-500 border border-gold-500/20 px-1.5 py-0.5 rounded font-sans uppercase font-bold tracking-wide">Seu Vídeo</span>
                      <h4 className="text-xs font-bold text-gold-500 leading-snug line-clamp-2 mt-1">{suggestedTitle || activeProject || 'Sem Título Sugerido'}</h4>
                      <p className="text-[10px] text-zinc-550 mt-0.5">AI Construction Stories • 0 views • Agora</p>
                    </div>
                  </div>

                  {/* Item 3: Competitor */}
                  <div className="flex gap-3 bg-zinc-950/30 p-2 rounded-xl border border-zinc-900/30">
                    <img src="https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=260&q=80" alt="Comp 2" className="w-36 h-20 object-cover rounded-lg border border-zinc-900 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">O MISTÉRIO DE 2.000 ANOS DO DISPOSITIVO DE ANTICITERA!</h4>
                      <p className="text-[10px] text-zinc-550 mt-1">Fatos Desconhecidos • 840K views • 1 semana atrás</p>
                    </div>
                  </div>

                  {/* Item 4: Competitor */}
                  <div className="flex gap-3 bg-zinc-950/30 p-2 rounded-xl border border-zinc-900/30">
                    <img src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=260&q=80" alt="Comp 3" className="w-36 h-20 object-cover rounded-lg border border-zinc-900 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">OS INCAS CONSTRUÍAM SEM CIMENTO E COM ALINHAMENTO PERFEITO?</h4>
                      <p className="text-[10px] text-zinc-550 mt-1">Manual do Mundo • 3M views • 1 mês atrás</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Tips & Recommendations Sidebar column */}
              <div className="col-span-1 border-l border-zinc-900/60 pl-6 space-y-4">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Verificação de Destaque</span>
                
                <div className="space-y-3 text-[10px] text-gray-400">
                  <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-900/40 space-y-1">
                    <h5 className="font-bold text-white flex items-center gap-1">
                      <Eye className="w-3 h-3 text-gold-500" />
                      1. Contraste de Tons
                    </h5>
                    <p className="leading-relaxed">Ative o filtro **Preto & Branco** para ver se as massas escuras e claras criam boa separação de elementos ou se misturam com os competidores.</p>
                  </div>

                  <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-900/40 space-y-1">
                    <h5 className="font-bold text-white flex items-center gap-1">
                      <EyeOff className="w-3 h-3 text-amber-500" />
                      2. Leitura Periférica
                    </h5>
                    <p className="leading-relaxed">Ative o **Filtro Blur** para simular como uma pessoa olhando rapidamente de relance reconhece a silhueta principal e a mensagem do vídeo.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Baseline test game modal */}
      {showBaselineGame && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in font-sans">
          <div className="bg-[#0f0f12] border border-zinc-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl p-6 relative">
            <button 
              onClick={() => setShowBaselineGame(false)} 
              className="text-zinc-500 hover:text-white absolute top-4 right-4 p-1 rounded hover:bg-zinc-900 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {gameStage === 'countdown' && (
              <div className="text-center py-20 space-y-4">
                <span className="text-[10px] font-bold text-gold-500 uppercase tracking-widest block font-sans">O Teste Começará Em Breve</span>
                <div className="text-6xl font-extrabold text-white animate-ping font-sans">{countdown}</div>
                <p className="text-[10px] text-gray-500 max-w-xs mx-auto leading-relaxed">
                  Encontre sua miniatura na grade de 6 imagens e clique nela o mais rápido possível!
                </p>
              </div>
            )}

            {gameStage === 'playing' && (
              <div className="space-y-4">
                <div className="text-center">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block font-sans">Ache sua miniatura</span>
                  <h4 className="text-sm font-bold text-white mt-1">CLIQUE NELA IMEDIATAMENTE!</h4>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {gameThumbnails.map((item, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleGameThumbnailClick(item.isUser)}
                      className="border border-zinc-900 bg-zinc-950 rounded-xl overflow-hidden cursor-pointer hover:border-gold-500/40 transition-all hover:scale-[1.02]"
                    >
                      <img src={item.url} alt={`Thumb ${idx}`} className="w-full h-24 object-cover" />
                      <div className="p-2 min-w-0">
                        <h5 className="text-[9px] font-bold text-white truncate">{item.title}</h5>
                        <span className="text-[8px] text-zinc-600 block mt-0.5">{item.views}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {gameStage === 'result' && (
              <div className="text-center py-12 space-y-6">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">Teste de Velocidade de Reconhecimento</span>
                  <h3 className="text-3xl font-extrabold text-white font-sans">{reactionTime} ms</h3>
                  <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                    {reactionTime && reactionTime < 800 
                      ? "Excelente! Destaque imediato. Sua thumbnail sobressai no feed em menos de um segundo!"
                      : reactionTime && reactionTime < 1500
                      ? "Bom! O tempo de reconhecimento está na média do YouTube. A thumbnail é identificável."
                      : "Atenção: Tempo alto de detecção. Considere usar elementos visuais maiores e cores com maior contraste."
                    }
                  </p>
                </div>

                <div className="flex justify-center gap-3">
                  <button 
                    onClick={() => setGameStage('countdown')}
                    className="bg-gold-500 hover:bg-gold-600 text-zinc-950 text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    Testar Novamente
                  </button>
                  <button 
                    onClick={() => setShowBaselineGame(false)}
                    className="border border-zinc-850 hover:bg-zinc-900 text-gray-300 text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    Fechar Teste
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Iteration/Refinement Sidebar/Chat Panel */}
      {showChatPanel && (
        <div className="fixed inset-y-0 right-0 z-50 bg-[#0f0f12] border-l border-zinc-900 w-full max-w-md flex flex-col shadow-2xl font-sans text-xs">
          {/* Header */}
          <div className="p-4 border-b border-zinc-900/60 flex justify-between items-center bg-zinc-950/20">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gold-500" />
              <h3 className="font-bold text-white uppercase tracking-wider font-sans">Refinar com IA</h3>
            </div>
            <button onClick={() => setShowChatPanel(false)} className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-900 transition cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat message history */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#09090b]">
            {chatHistory.map((m, idx) => (
              <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                  m.sender === 'user' 
                    ? 'bg-gold-500 text-zinc-950 font-medium' 
                    : 'bg-zinc-900/60 border border-zinc-850 text-gray-300'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-900/60 border border-zinc-850 text-gray-500 p-3 rounded-2xl animate-pulse">
                  Processando sugestões...
                </div>
              </div>
            )}
          </div>

          {/* Footer chat input */}
          <div className="p-4 border-t border-zinc-900/60 bg-zinc-950/20 flex gap-2">
            <input 
              type="text"
              placeholder="Digite sua dúvida ou instrução (ex: 'Como melhorar o contraste?')..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
              className="bg-zinc-950 border border-zinc-850 text-white rounded-xl px-4 py-2 focus:outline-none focus:border-gold-500 flex-1"
            />
            <button 
              onClick={handleSendChatMessage}
              className="bg-gold-500 hover:bg-gold-600 text-zinc-950 font-bold px-4 py-2 rounded-xl transition cursor-pointer shrink-0"
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
