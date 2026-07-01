import React, { useState } from 'react';
import { 
  BookOpen, 
  Smile, 
  MessageSquare, 
  Star, 
  User, 
  Award, 
  Search, 
  Sparkles, 
  CheckCircle, 
  Check, 
  Save,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface TitleWizardConfig {
  contentType: string;
  subTags: string[];
  brandVoice: string;
  audienceDescription: string;
  audienceAgeRange: string;
  audiencePainPoints: string[];
  audienceAspirations: string[];
  audienceCoreValues: string[];
  evolutionStrategy: string;
  psychologicalTriggers: string[];
  titleFormulas: string[];
}

interface TitleStrategyWizardProps {
  onClose: () => void;
  onApply: (config: TitleWizardConfig) => void;
  initialConfig?: Partial<TitleWizardConfig>;
}

export const TitleStrategyWizard: React.FC<TitleStrategyWizardProps> = ({
  onClose,
  onApply,
  initialConfig = {}
}) => {
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardExpandedCategory, setWizardExpandedCategory] = useState<string>('Educational/Tutorial');
  
  // State for selections
  const [selectedContentType, setSelectedContentType] = useState<string>(initialConfig.contentType || 'Conceptual Teaching');
  const [selectedSubTags, setSelectedSubTags] = useState<string[]>(initialConfig.subTags || []);
  const [selectedBrandVoice, setSelectedBrandVoice] = useState<string>(initialConfig.brandVoice || 'The Authority');

  // Target Audience states
  const [audienceDescription, setAudienceDescription] = useState<string>(initialConfig.audienceDescription || '');
  const [audienceAgeRange, setAudienceAgeRange] = useState<string>(initialConfig.audienceAgeRange || '');
  const [audiencePainPoints, setAudiencePainPoints] = useState<string[]>(initialConfig.audiencePainPoints || []);
  const [audienceAspirations, setAudienceAspirations] = useState<string[]>(initialConfig.audienceAspirations || []);
  const [audienceCoreValues, setAudienceCoreValues] = useState<string[]>(initialConfig.audienceCoreValues || []);

  const [newPainPoint, setNewPainPoint] = useState<string>('');
  const [newAspiration, setNewAspiration] = useState<string>('');
  const [newCoreValue, setNewCoreValue] = useState<string>('');

  // Evolution state
  const [selectedEvolutionStrategy, setSelectedEvolutionStrategy] = useState<string>(initialConfig.evolutionStrategy || 'Standard Evolution');

  // Psychological triggers & formulas
  const [selectedPsychologicalTriggers, setSelectedPsychologicalTriggers] = useState<string[]>(initialConfig.psychologicalTriggers || ['Curiosity Gap']);
  const [selectedTitleFormulas, setSelectedTitleFormulas] = useState<string[]>(initialConfig.titleFormulas || ['Why Questions']);

  const handleApply = () => {
    onApply({
      contentType: selectedContentType,
      subTags: selectedSubTags,
      brandVoice: selectedBrandVoice,
      audienceDescription,
      audienceAgeRange,
      audiencePainPoints,
      audienceAspirations,
      audienceCoreValues,
      evolutionStrategy: selectedEvolutionStrategy,
      psychologicalTriggers: selectedPsychologicalTriggers,
      titleFormulas: selectedTitleFormulas
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-6 animate-fade-in text-gray-200 p-1">
      {/* Wizard Title & Subtitle */}
      <div className="shrink-0 text-left">
        <h2 className="text-xl font-extrabold text-white font-cinzel">Customize Your Title Strategy</h2>
        <p className="text-xs text-zinc-400 mt-1">Tell us about your content and audience to get personalized title recommendations</p>
      </div>

      {/* Progress and Tags */}
      <div className="space-y-3 shrink-0">
        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
          <span>Step {wizardStep} of 7</span>
          <span className="text-gold-500 font-cinzel font-bold">
            {wizardStep === 1 && 'Content Type'}
            {wizardStep === 2 && 'Brand Voice'}
            {wizardStep === 3 && 'Target Audience'}
            {wizardStep === 4 && 'Evolution Strategy'}
            {wizardStep === 5 && 'Psychological Triggers'}
            {wizardStep === 6 && 'Title Formulas'}
            {wizardStep === 7 && 'Review & Submit'}
          </span>
        </div>
        {/* Progress bar track */}
        <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold-500 rounded-full transition-all duration-300"
            style={{ width: `${(wizardStep / 7) * 100}%` }}
          />
        </div>
        {/* Step quick tags list */}
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            { id: 1, label: 'Content Type' },
            { id: 2, label: 'Brand Voice' },
            { id: 3, label: 'Target Audience' },
            { id: 4, label: 'Evolution Strategy' },
            { id: 5, label: 'Psychological Triggers' },
            { id: 6, label: 'Title Formulas' },
            { id: 7, label: 'Review & Submit' }
          ].map((s) => (
            <button
              key={s.id}
              disabled={s.id > wizardStep && !selectedContentType}
              onClick={() => setWizardStep(s.id)}
              className={`text-[9px] font-bold px-2.5 py-1 rounded-full transition border font-sans cursor-pointer ${
                wizardStep === s.id
                  ? 'bg-gold-500 text-zinc-950 border-gold-500 shadow-md shadow-gold-500/10'
                  : s.id < wizardStep
                  ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                  : 'bg-zinc-950/20 border-zinc-900/50 text-zinc-650 cursor-not-allowed'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Step Container Panel */}
      <div className="flex-1 min-h-0 bg-zinc-950/40 border border-zinc-900/80 rounded-2xl p-6 overflow-y-auto flex flex-col justify-between">
        
        {/* STEP 1: CONTENT TYPE */}
        {wizardStep === 1 && (
          <div className="space-y-4 flex-1 text-left">
            <div>
              <h3 className="text-white text-xs font-bold font-cinzel">What type of content do you create?</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">Choose the category that best describes your video style</p>
            </div>

            <div className="space-y-3">
              {[
                {
                  name: 'Educational/Tutorial',
                  icon: <BookOpen className="w-3.5 h-3.5" />,
                  items: [
                    {
                      title: 'Conceptual Teaching',
                      desc: 'Focus on mental models and understanding',
                      tags: ['Why X works', 'The theory behind Y', 'Understanding the system']
                    },
                    {
                      title: 'Practical Skills',
                      desc: 'Focus on implementation and doing',
                      tags: ['How to do X', 'Step-by-step process', 'Common mistakes']
                    },
                    {
                      title: 'Troubleshooting',
                      desc: 'Focus on solving specific problems',
                      tags: ['Why X isn\'t working', 'Fixing errors', 'Debugging approaches']
                    }
                  ]
                },
                {
                  name: 'Entertainment',
                  icon: <Smile className="w-3.5 h-3.5" />,
                  items: [
                    {
                      title: 'Narrative Comedy',
                      desc: 'Story-driven humor',
                      tags: ['Character scenarios', 'Situational absurdity', 'Relatable moments']
                    },
                    {
                      title: 'Observational Comedy',
                      desc: 'Commentary on life',
                      tags: ['Social observations', 'Cultural critique', 'Everyday absurdities']
                    },
                    {
                      title: 'Parody/Satire',
                      desc: 'Mocking specific targets',
                      tags: ['Genre parodies', 'Social satire', 'Format spoofs']
                    }
                  ]
                },
                {
                  name: 'Commentary/Analysis',
                  icon: <MessageSquare className="w-3.5 h-3.5" />,
                  items: [
                    {
                      title: 'News Analysis',
                      desc: 'Current events deep dive',
                      tags: ['Context and background', 'Multiple perspectives', 'Implications']
                    },
                    {
                      title: 'Cultural Commentary',
                      desc: 'Trends and society',
                      tags: ['Social phenomena', 'Generation gaps', 'Technology impact']
                    },
                    {
                      title: 'Industry Analysis',
                      desc: 'Specific sector focus',
                      tags: ['Business moves', 'Market trends', 'Strategic decisions']
                    }
                  ]
                },
                {
                  name: 'Review/Critique',
                  icon: <Star className="w-3.5 h-3.5" />,
                  items: [
                    {
                      title: 'Experiential Review',
                      desc: 'Personal experience focus',
                      tags: ['My experience with X', 'Living with Y', 'What it\'s really like']
                    },
                    {
                      title: 'Comparative Analysis',
                      desc: 'Multiple options',
                      tags: ['X vs Y vs Z', 'Which is best', 'The surprising winner']
                    },
                    {
                      title: 'Deep Critique',
                      desc: 'Thorough examination',
                      tags: ['Everything wrong with X', 'Hidden details', 'Deconstructing Z']
                    }
                  ]
                },
                {
                  name: 'Personal/Vlog',
                  icon: <User className="w-3.5 h-3.5" />,
                  items: [
                    {
                      title: 'Journey Documentation',
                      desc: 'Process over time',
                      tags: ['My path to X', '30 days of Y', 'Learning from scratch']
                    },
                    {
                      title: 'Life Updates',
                      desc: 'Personal milestones',
                      tags: ['Big changes', 'Lessons learned', 'What I discovered']
                    },
                    {
                      title: 'Behind the Scenes',
                      desc: 'Process revelation',
                      tags: ['How I really do X', 'The truth about Y', 'What you don\'t see']
                    }
                  ]
                }
              ].map((cat) => {
                const isExpanded = wizardExpandedCategory === cat.name;
                return (
                  <div key={cat.name} className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-950/20">
                    <button
                      onClick={() => setWizardExpandedCategory(isExpanded ? '' : cat.name)}
                      className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-white hover:bg-zinc-900/40 transition cursor-pointer font-sans"
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-gold-500">{cat.icon}</div>
                        <span className="font-cinzel tracking-wider text-[11px]">{cat.name}</span>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                    </button>

                    {isExpanded && (
                      <div className="p-3 border-t border-zinc-900/60 space-y-2 bg-zinc-950/40">
                        {cat.items.map((item) => {
                          const isSelected = selectedContentType === item.title;
                          return (
                            <div
                              key={item.title}
                              onClick={() => {
                                setSelectedContentType(item.title);
                                setSelectedSubTags([]);
                              }}
                              className={`p-3 rounded-lg border transition cursor-pointer flex flex-col space-y-1.5 ${
                                isSelected
                                  ? 'border-gold-500/50 bg-gold-500/5'
                                  : 'border-zinc-900 bg-zinc-950/20 hover:border-zinc-800/50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="text-[11px] font-bold text-white font-sans">{item.title}</h4>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse" />}
                              </div>
                              <p className="text-[9px] text-zinc-400 font-sans">{item.desc}</p>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {item.tags.map((tag) => {
                                  const tagSelected = selectedSubTags.includes(tag);
                                  return (
                                    <span
                                      key={tag}
                                      onClick={(e) => {
                                        if (!isSelected) return; // Only allow selecting tags of selected type
                                        e.stopPropagation();
                                        setSelectedSubTags(prev =>
                                          prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                        );
                                      }}
                                      className={`text-[8px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                                        tagSelected
                                          ? 'bg-gold-500 text-zinc-950 border-gold-500'
                                          : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-300'
                                      }`}
                                    >
                                      {tag}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: BRAND VOICE */}
        {wizardStep === 2 && (
          <div className="space-y-4 flex-1 text-left">
            <div>
              <h3 className="text-white text-xs font-bold font-cinzel">What's your brand voice?</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">How do you communicate with your audience?</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: 'The Authority', desc: 'Unquestionable expertise', language: 'Definitive statements, technical precision', pill: 'Learn from the best', icon: <Award className="w-4 h-4" /> },
                { name: 'The Investigator', desc: 'Truth seeker, myth buster', language: 'Questions, revelations, evidence', pill: 'Uncover the truth', icon: <Search className="w-4 h-4" /> },
                { name: 'The Friend', desc: 'Peer-to-peer, relatable', language: 'Casual, personal, inclusive', pill: 'We\'re in this together', icon: <User className="w-4 h-4" /> },
                { name: 'The Maverick', desc: 'Contrarian, rule breaker', language: 'Challenge, controversy, alternative', pill: 'Think different', icon: <Sparkles className="w-4 h-4" /> },
                { name: 'The Mentor', desc: 'Wise guide, patient teacher', language: 'Encouraging, structured, progressive', pill: 'I\'ll help you grow', icon: <BookOpen className="w-4 h-4" /> },
                { name: 'The Entertainer', desc: 'Fun first, value second', language: 'Energetic, surprising, playful', pill: 'You\'ll love this', icon: <Smile className="w-4 h-4" /> }
              ].map((voice) => (
                <div
                  key={voice.name}
                  onClick={() => setSelectedBrandVoice(voice.name)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex flex-col space-y-2 text-left relative ${
                    selectedBrandVoice === voice.name
                      ? 'border-gold-500 bg-gold-500/5 shadow-lg shadow-gold-500/5'
                      : 'border-zinc-800 bg-zinc-950/20 hover:border-zinc-750'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={selectedBrandVoice === voice.name ? 'text-gold-500' : 'text-zinc-500'}>
                      {voice.icon}
                    </div>
                    <span className="text-[11px] font-bold text-white font-sans">{voice.name}</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 font-sans">{voice.desc}</span>
                  <span className="text-[9px] text-zinc-400 font-sans">
                    <strong className="text-zinc-500">Language:</strong> {voice.language}
                  </span>
                  <div className="pt-1">
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${
                      selectedBrandVoice === voice.name
                        ? 'bg-gold-500/10 text-gold-400 border-gold-500/20'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-550'
                    }`}>
                      {voice.pill}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: TARGET AUDIENCE */}
        {wizardStep === 3 && (
          <div className="space-y-4 flex-1 text-left">
            <div>
              <h3 className="text-white text-xs font-bold font-cinzel">Who is your target audience?</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">Be specific about who should watch this content</p>
            </div>

            <div className="space-y-4">
              {/* Section 1: Audience Description */}
              <div className="border border-zinc-800/80 rounded-xl p-4 bg-zinc-950/20 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-white font-bold uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <User className="w-3.5 h-3.5 text-gold-500" /> Audience Description
                  </label>
                  {audienceDescription.length >= 20 && (
                    <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 animate-pulse" /> Good detail level
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-zinc-500 font-sans">Describe your ideal viewer in detail (20-300 characters)</p>
                <textarea
                  value={audienceDescription}
                  onChange={(e) => setAudienceDescription(e.target.value.substring(0, 300))}
                  placeholder="Ex: Pessoas interessadas em fatos históricos e curiosidades que querem entender os detalhes ocultos por trás de grandes construções antigas..."
                  className="w-full h-20 bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl p-3 text-xs text-white resize-none font-sans"
                />
                <div className="flex justify-between items-center text-[9px] text-zinc-500 font-sans">
                  <span>{audienceDescription.length}/300 characters</span>
                  <div className="flex gap-2">
                    {[
                      "People who've tried learning this before and failed",
                      "Professionals who need this skill but don't have formal training",
                      "Students who learn better from video than textbooks"
                    ].map((tpl) => (
                      <button
                        key={tpl}
                        onClick={() => setAudienceDescription(tpl)}
                        className="bg-zinc-900 hover:bg-zinc-855 text-zinc-400 hover:text-white px-2 py-1 rounded text-[8px] transition cursor-pointer border border-zinc-800"
                      >
                        {tpl.substring(0, 15)}...
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 2: Psychological Profile (Optional) */}
              <div className="border border-zinc-800/80 rounded-xl p-4 bg-zinc-950/20 space-y-3">
                <div className="flex justify-between items-center font-sans">
                  <label className="text-[10px] text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-gold-500 animate-pulse" /> Psychological Profile
                  </label>
                  <span className="text-[8px] bg-zinc-900 border border-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded uppercase font-bold">Optional</span>
                </div>
                <p className="text-[9px] text-zinc-500 font-sans">Add deeper insights about your audience for better targeting</p>

                <div className="space-y-3 text-xs font-sans">
                  {/* Age Range */}
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase">Age Range</span>
                    <input
                      type="text"
                      value={audienceAgeRange}
                      onChange={(e) => setAudienceAgeRange(e.target.value)}
                      placeholder="e.g., 18-24, 25-34, 35+"
                      className="w-full bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  {/* Pain Points */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase">Pain Points</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPainPoint}
                        onChange={(e) => setNewPainPoint(e.target.value)}
                        placeholder="What problems do they have?"
                        className="flex-1 bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                      <button
                        onClick={() => {
                          if (newPainPoint.trim()) {
                            setAudiencePainPoints(prev => [...prev, newPainPoint.trim()]);
                            setNewPainPoint('');
                          }
                        }}
                        className="bg-gold-500 hover:bg-gold-600 text-zinc-950 px-3.5 rounded-lg font-bold text-xs cursor-pointer transition"
                      >
                        +
                      </button>
                    </div>
                    {audiencePainPoints.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {audiencePainPoints.map((item, idx) => (
                          <span key={idx} className="bg-zinc-900 border border-zinc-800 text-[8px] font-bold text-zinc-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            {item}
                            <button onClick={() => setAudiencePainPoints(prev => prev.filter((_, i) => i !== idx))} className="text-zinc-500 hover:text-red-400 font-bold ml-0.5">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Aspirations */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase">Aspirations</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newAspiration}
                        onChange={(e) => setNewAspiration(e.target.value)}
                        placeholder="What do they want to achieve?"
                        className="flex-1 bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                      <button
                        onClick={() => {
                          if (newAspiration.trim()) {
                            setAudienceAspirations(prev => [...prev, newAspiration.trim()]);
                            setNewAspiration('');
                          }
                        }}
                        className="bg-gold-500 hover:bg-gold-600 text-zinc-950 px-3.5 rounded-lg font-bold text-xs cursor-pointer transition"
                      >
                        +
                      </button>
                    </div>
                    {audienceAspirations.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {audienceAspirations.map((item, idx) => (
                          <span key={idx} className="bg-zinc-900 border border-zinc-800 text-[8px] font-bold text-zinc-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            {item}
                            <button onClick={() => setAudienceAspirations(prev => prev.filter((_, i) => i !== idx))} className="text-zinc-500 hover:text-red-400 font-bold ml-0.5">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Core Values */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase">Core Values</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCoreValue}
                        onChange={(e) => setNewCoreValue(e.target.value)}
                        placeholder="What do they care about?"
                        className="flex-1 bg-zinc-950 border border-zinc-850 focus:border-gold-500 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                      <button
                        onClick={() => {
                          if (newCoreValue.trim()) {
                            setAudienceCoreValues(prev => [...prev, newCoreValue.trim()]);
                            setNewCoreValue('');
                          }
                        }}
                        className="bg-gold-500 hover:bg-gold-600 text-zinc-950 px-3.5 rounded-lg font-bold text-xs cursor-pointer transition"
                      >
                        +
                      </button>
                    </div>
                    {audienceCoreValues.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {audienceCoreValues.map((item, idx) => (
                          <span key={idx} className="bg-zinc-900 border border-zinc-800 text-[8px] font-bold text-zinc-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            {item}
                            <button onClick={() => setAudienceCoreValues(prev => prev.filter((_, i) => i !== idx))} className="text-zinc-500 hover:text-red-400 font-bold ml-0.5">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: EVOLUTION STRATEGY */}
        {wizardStep === 4 && (
          <div className="space-y-4 flex-1 text-left">
            <div>
              <h3 className="text-white text-xs font-bold font-cinzel">Title Evolution Strategy</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">How quickly should your titles evolve from specific to broad over time?</p>
            </div>

            <div className="space-y-3">
              {[
                {
                  name: 'Conservative Evolution',
                  badge: 'Very Low',
                  badgeStyle: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                  desc: 'Build strong foundation with core audience before expanding',
                  timeline: 'Weeks between changes',
                  riskLevel: 25,
                  bestFor: 'Educational content, tutorials, niche topics'
                },
                {
                  name: 'Standard Evolution',
                  badge: 'Low',
                  badgeStyle: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                  desc: 'Balance initial specificity with measured expansion',
                  timeline: 'Days to weeks between changes',
                  riskLevel: 55,
                  bestFor: 'Most content types, balanced growth approach'
                },
                {
                  name: 'Aggressive Evolution',
                  badge: 'Moderate',
                  badgeStyle: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
                  desc: 'Rapid testing and expansion if metrics support it',
                  timeline: 'Hours to days between changes',
                  riskLevel: 80,
                  bestFor: 'Trending topics, viral content, time-sensitive material'
                }
              ].map((strategy) => (
                <div
                  key={strategy.name}
                  onClick={() => setSelectedEvolutionStrategy(strategy.name)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex flex-col space-y-3 ${
                    selectedEvolutionStrategy === strategy.name
                      ? 'border-gold-500 bg-gold-500/5 shadow-lg shadow-gold-500/5'
                      : 'border-zinc-800 bg-zinc-950/20 hover:border-zinc-750'
                  }`}
                >
                  <div className="flex justify-between items-center font-sans">
                    <span className="text-[11px] font-bold text-white">{strategy.name}</span>
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${strategy.badgeStyle}`}>
                      {strategy.badge}
                    </span>
                  </div>

                  <p className="text-[9px] text-zinc-400 font-sans">{strategy.desc}</p>

                  <div className="grid grid-cols-2 gap-4 items-center font-sans">
                    <div className="space-y-1 text-left">
                      <span className="text-[8px] text-zinc-550 font-bold uppercase tracking-wider block">Evolution Timeline</span>
                      <div className="text-[9px] text-white flex items-center gap-1">
                        <span className="text-zinc-650">⏱</span> {strategy.timeline}
                      </div>
                    </div>
                    <div className="space-y-1 text-left">
                      <span className="text-[8px] text-zinc-550 font-bold uppercase tracking-wider block">Risk Level</span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
                          <div className="h-full bg-gold-500 rounded-full" style={{ width: `${strategy.riskLevel}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-[9px] text-zinc-500 font-sans">
                    <strong>Best for:</strong> {strategy.bestFor}
                  </div>
                </div>
              ))}

              {/* Info Panel footer */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-2 mt-4 font-sans text-xs">
                <div className="flex items-center gap-2 text-white font-semibold text-[10px] uppercase tracking-wider">
                  <span>📈 How this affects your titles:</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[9px] text-zinc-400 text-left">
                  <li><strong>Conservative Evolution:</strong> Start highly specific, evolve slowly (weeks)</li>
                  <li><strong>Standard Evolution:</strong> Balanced approach (days to weeks)</li>
                  <li><strong>Aggressive Evolution:</strong> Test broader appeal quickly (hours to days)</li>
                </ul>
                <p className="text-[9px] text-zinc-500 italic mt-1 text-left">The AI will generate titles appropriate for each video's age based on this strategy.</p>
              </div>

            </div>
          </div>
        )}

        {/* STEP 5: PSYCHOLOGICAL TRIGGERS */}
        {wizardStep === 5 && (
          <div className="space-y-4 flex-1 text-left">
            <div>
              <h3 className="text-white text-xs font-bold font-cinzel">Select psychological triggers</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">Choose 1-2 triggers that align with your content strategy (max 2)</p>
            </div>

            <div className="space-y-4">
              {[
                {
                  category: 'Cognitive Triggers',
                  items: [
                    { name: 'Curiosity Gap', desc: 'Need to know. Partial information that demands completion.', pill: 'The real reason why...' },
                    { name: 'Pattern Interruption', desc: 'Attention grab. Unexpected element breaks routine.', pill: 'This weird trick...' },
                    { name: 'Cognitive Dissonance', desc: 'Mental conflict. Challenge existing beliefs.', pill: 'Why everything you know is wrong...' }
                  ]
                },
                {
                  category: 'Emotional Triggers',
                  items: [
                    { name: 'Status Anxiety', desc: 'Fear of falling behind. Others are getting ahead.', pill: 'What successful people know about...' },
                    { name: 'Belonging Need', desc: 'Community desire. Group inclusion.', pill: 'Join millions who...' },
                    { name: 'Loss Aversion', desc: 'Fear of missing out. Potential loss feels urgent.', pill: 'Last chance to...' }
                  ]
                },
                {
                  category: 'Social Triggers',
                  items: [
                    { name: 'Social Proof', desc: 'Validation seeking. Crowd wisdom.', pill: 'Why everyone is switching to...' },
                    { name: 'Authority Bias', desc: 'Trust in expertise. Expert endorsement.', pill: 'Scientists reveal...' },
                    { name: 'Reciprocity Drive', desc: 'Obligation to give back. Free value creates debt.', pill: 'Free guide inside...' }
                  ]
                },
                {
                  category: 'Identity Triggers',
                  items: [
                    { name: 'Aspirational Identity', desc: 'Vision of better self. Identity projection.', pill: 'Think like a...' },
                    { name: 'Tribal Identity', desc: 'Group belonging. Us vs them.', pill: 'Real creators know...' },
                    { name: 'Competence Validation', desc: 'Skill confirmation. Expertise recognition.', pill: 'Test your knowledge...' }
                  ]
                }
              ].map((group) => (
                <div key={group.category} className="space-y-2">
                  <h4 className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider font-sans">{group.category}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {group.items.map((trigger) => {
                      const isSelected = selectedPsychologicalTriggers.includes(trigger.name);
                      return (
                        <div
                          key={trigger.name}
                          onClick={() => {
                            setSelectedPsychologicalTriggers(prev => {
                              if (isSelected) {
                                return prev.filter(t => t !== trigger.name);
                              } else {
                                if (prev.length >= 2) {
                                  toast.error('Selecione no máximo 2 gatilhos psicológicos!');
                                  return prev;
                                }
                                return [...prev, trigger.name];
                              }
                            });
                          }}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col space-y-1.5 ${
                            isSelected
                              ? 'border-gold-500 bg-gold-500/5 shadow-md shadow-gold-500/5'
                              : 'border-zinc-800 bg-zinc-950/20 hover:border-zinc-750'
                          }`}
                        >
                          <div className="flex justify-between items-center font-sans">
                            <span className="text-[10px] font-bold text-white">{trigger.name}</span>
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                              isSelected ? 'border-gold-500 bg-gold-500 text-zinc-950' : 'border-zinc-800 bg-zinc-950'
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5 font-bold" />}
                            </div>
                          </div>
                          <p className="text-[8.5px] text-zinc-400 leading-normal font-sans">{trigger.desc}</p>
                          <div className="pt-1">
                            <span className="text-[8px] font-bold text-zinc-550 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full italic font-sans">
                              {trigger.pill}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 6: TITLE FORMULAS (Pick your title patterns) */}
        {wizardStep === 6 && (
          <div className="space-y-4 flex-1 text-left">
            <div>
              <h3 className="text-white text-xs font-bold font-cinzel">Pick your title patterns</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">Select 1-3 title structures that work best for your content</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  category: 'Questions',
                  icon: '❓',
                  items: [
                    { name: 'Why Questions', desc: 'Explains causes and reasons behind phenomena', example: 'Why Smart People Make Bad Decisions' },
                    { name: 'How-To Guides', desc: 'Step-by-step instructions to achieve goals', example: 'How to Get Your First 1000 Subscribers' },
                    { name: 'Decision Help', desc: 'Helps viewers choose between options', example: 'Which Camera Should You Buy in 2024?' },
                    { name: 'What-If Scenarios', desc: 'Explores hypothetical situations', example: 'What If We Could Read Minds?' }
                  ]
                },
                {
                  category: 'Revelations',
                  icon: '💡',
                  items: [
                    { name: 'Hidden Truths', desc: 'Reveals unknown or concealed information', example: 'The Hidden Cost of Free Apps' },
                    { name: 'Myth Busting', desc: 'Challenges common beliefs', example: 'Everything You Know About Sleep Is Wrong' },
                    { name: 'Industry Secrets', desc: 'Exposes insider knowledge', example: 'What Airlines Don\'t Want You to Know' },
                    { name: 'Personal Discovery', desc: 'Shares surprising personal findings', example: 'I Found the Perfect Morning Routine' }
                  ]
                },
                {
                  category: 'Transformations',
                  icon: '🛠',
                  items: [
                    { name: 'Journey Stories', desc: 'Shows complete transformation arc', example: 'From 0 to 1M Subscribers: My Journey' },
                    { name: 'Before & After', desc: 'Highlights dramatic changes', example: '30 Days of Cold Showers (Shocking Results)' },
                    { name: 'Process Breakdown', desc: 'Details the complete process', example: 'Building My Dream Studio (Complete Process)' },
                    { name: 'Milestone Moments', desc: 'Celebrates significant achievements', example: 'My First $10K Month (How It Happened)' }
                  ]
                },
                {
                  category: 'Comparisons',
                  icon: '⚖️',
                  items: [
                    { name: 'Head-to-Head', desc: 'Direct comparison of options', example: 'iPhone vs Android: 2024 Showdown' },
                    { name: 'David vs Goliath', desc: 'Underdog outperforms expensive option', example: '$50 Camera DESTROYS $5000 Setup' },
                    { name: 'Then vs Now', desc: 'Shows how things have evolved', example: 'YouTube Then vs Now (What Changed)' },
                    { name: 'Better Alternative', desc: 'Suggests superior alternatives', example: 'Forget ChatGPT, This AI Is Better' }
                  ]
                },
                {
                  category: 'News & Journalism',
                  icon: '📰',
                  items: [
                    { name: 'Breaking News', desc: 'Urgent, time-sensitive information', example: 'Breaking: Major Tech Company Announces Layoffs' },
                    { name: 'Developing Story', desc: 'Ongoing situation with updates', example: 'Silicon Valley Bank Collapse: What We Know So Far' },
                    { name: 'Exclusive Report', desc: 'Unique access or information', example: 'Exclusive: Inside the Secret Meeting That Changed Everything' },
                    { name: 'Investigation', desc: 'Deep dive investigative journalism', example: '6-Month Investigation Reveals Data Breach Cover-Up' },
                    { name: 'Analysis/Explainer', desc: 'Context and explanation of complex topics', example: 'Explained: Why the Fed Rate Hike Affects Your Wallet' }
                  ]
                }
              ].map((group) => (
                <div key={group.category} className="border border-zinc-800 rounded-xl p-4 bg-zinc-950/20 space-y-3">
                  <h4 className="text-[10px] text-white font-bold uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <span>{group.icon}</span> {group.category}
                  </h4>
                  <div className="space-y-2">
                    {group.items.map((formula) => {
                      const isSelected = selectedTitleFormulas.includes(formula.name);
                      return (
                        <div
                          key={formula.name}
                          onClick={() => {
                            setSelectedTitleFormulas(prev => {
                              if (isSelected) {
                                return prev.filter(f => f !== formula.name);
                              } else {
                                if (prev.length >= 3) {
                                  toast.error('Selecione no máximo 3 padrões de títulos!');
                                  return prev;
                                }
                                return [...prev, formula.name];
                              }
                            });
                          }}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                            isSelected
                              ? 'border-gold-500 bg-gold-500/5 shadow-md shadow-gold-500/5'
                              : 'border-zinc-900 bg-zinc-950/10 hover:border-zinc-800/80'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                            isSelected ? 'border-gold-500 bg-gold-500 text-zinc-950' : 'border-zinc-800 bg-zinc-950'
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />}
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5 font-sans">
                            <span className="text-[10px] font-bold text-white block">{formula.name}</span>
                            <p className="text-[8.5px] text-zinc-550 leading-normal">{formula.desc}</p>
                            <div className="pt-0.5">
                              <span className="text-[8px] font-semibold text-zinc-400 bg-zinc-900/60 border border-zinc-800 px-2 py-0.5 rounded italic">
                                Example: {formula.example}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 7: REVIEW & SUBMIT */}
        {wizardStep === 7 && (
          <div className="space-y-4 flex-1 text-left">
            <div>
              <h3 className="text-white text-xs font-bold font-cinzel">Review Your Preferences</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5 font-sans">These settings will be used to generate optimized title suggestions</p>
            </div>

            <div className="space-y-3 font-sans text-xs">
              {/* Content Type */}
              <div className="border border-zinc-850 bg-zinc-950/20 p-3.5 rounded-xl flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block">Content Type</span>
                  <p className="text-zinc-400 text-[10px]">Selected video template style</p>
                </div>
                <span className="bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-white px-3 py-1 rounded-lg">
                  {selectedContentType || 'Conceptual Teaching'}
                </span>
              </div>

              {/* Brand Voice */}
              <div className="border border-zinc-850 bg-zinc-950/20 p-3.5 rounded-xl flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block">Brand Voice</span>
                  <p className="text-zinc-400 text-[10px]">Channel identity tone</p>
                </div>
                <span className="bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-white px-3 py-1 rounded-lg">
                  {selectedBrandVoice}
                </span>
              </div>

              {/* Target Audience */}
              <div className="border border-zinc-850 bg-zinc-950/20 p-3.5 rounded-xl flex flex-col space-y-1">
                <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Target Audience</span>
                <p className="text-white font-semibold">{audienceDescription || 'No description provided'}</p>
                {audienceAgeRange && (
                  <p className="text-[9px] text-zinc-500">Age Target: {audienceAgeRange}</p>
                )}
              </div>

              {/* Evolution Strategy */}
              <div className="border border-zinc-850 bg-zinc-950/20 p-3.5 rounded-xl flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block">Evolution Strategy</span>
                  <p className="text-zinc-400 text-[10px]">How variants grow over time</p>
                </div>
                <span className="bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-white px-3 py-1 rounded-lg">
                  {selectedEvolutionStrategy}
                </span>
              </div>

              {/* Psychological Triggers */}
              <div className="border border-zinc-850 bg-zinc-950/20 p-3.5 rounded-xl flex flex-col space-y-2">
                <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Psychological Triggers</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPsychologicalTriggers.map(t => (
                    <span key={t} className="bg-gold-500 text-zinc-950 text-[9px] font-bold px-2.5 py-0.5 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Title Formulas */}
              <div className="border border-zinc-850 bg-zinc-950/20 p-3.5 rounded-xl flex flex-col space-y-2">
                <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Title Formulas</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTitleFormulas.map(f => (
                    <span key={f} className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-[9px] font-bold px-2.5 py-0.5 rounded-full">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Save details banner */}
              <div className="bg-zinc-900/20 border border-zinc-800 rounded-xl p-3.5 text-center mt-4">
                <p className="text-[10px] text-zinc-400">
                  ✨ Your preferences will be saved and used for all future title generation. You can update them anytime!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex justify-between items-center border-t border-zinc-900/60 pt-4 mt-6 shrink-0 font-sans">
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white text-xs font-bold cursor-pointer transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {wizardStep > 1 && (
              <button
                onClick={() => setWizardStep(prev => prev - 1)}
                className="border border-zinc-800 text-zinc-300 hover:text-white px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Back
              </button>
            )}

            {wizardStep < 7 ? (
              <button
                onClick={() => setWizardStep(prev => prev + 1)}
                disabled={wizardStep === 1 && !selectedContentType}
                className="bg-gold-500 hover:bg-gold-600 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 text-xs font-bold px-4 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleApply}
                className="bg-gold-500 hover:bg-gold-600 text-zinc-950 text-xs font-bold px-5 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-gold-500/10"
              >
                <Save className="w-3.5 h-3.5" />
                Save & Generate Titles
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
