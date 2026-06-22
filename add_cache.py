import re

with open('dashboard-qanat/frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Function to read from cache
cache_logic = """  const savedCreatorState = (() => {
    try {
      const saved = localStorage.getItem('qanat_creator_state');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {};
  })();
"""

if "savedCreatorState =" not in content:
    content = content.replace("const [creatorStep, setCreatorStep] = useState<number>(1);", cache_logic + "\n  const [creatorStep, setCreatorStep] = useState<number>(savedCreatorState.creatorStep || 1);")
    content = content.replace("const [nicheInput, setNicheInput] = useState<string>('');", "const [nicheInput, setNicheInput] = useState<string>(savedCreatorState.nicheInput || '');")
    content = content.replace("const [formatSelector, setFormatSelector] = useState<'LONGO' | 'SHORTS'>('LONGO');", "const [formatSelector, setFormatSelector] = useState<'LONGO' | 'SHORTS'>(savedCreatorState.formatSelector || 'LONGO');")
    
    # ideasData needs care since it has a type annotation
    content = re.sub(r'const \[ideasData, setIdeasData\] = useState<\{\n\s*ideas: any\[\];\n\s*\}\s*\|\s*null>\(null\);', "const [ideasData, setIdeasData] = useState<any>(savedCreatorState.ideasData || null);", content)
    
    content = content.replace("const [selectedIdeaIndex, setSelectedIdeaIndex] = useState<number>(-1);", "const [selectedIdeaIndex, setSelectedIdeaIndex] = useState<number>(savedCreatorState.selectedIdeaIndex !== undefined ? savedCreatorState.selectedIdeaIndex : -1);")
    content = content.replace("const [generatedScriptData, setGeneratedScriptData] = useState<any | null>(null);", "const [generatedScriptData, setGeneratedScriptData] = useState<any | null>(savedCreatorState.generatedScriptData || null);")

    # Add effect to save
    effect_code = """
  useEffect(() => {
    localStorage.setItem('qanat_creator_state', JSON.stringify({ creatorStep, nicheInput, formatSelector, ideasData, selectedIdeaIndex, generatedScriptData }));
  }, [creatorStep, nicheInput, formatSelector, ideasData, selectedIdeaIndex, generatedScriptData]);
"""
    content = content.replace("useEffect(() => {", effect_code + "\n  useEffect(() => {", 1)

with open('dashboard-qanat/frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added state cache logic!")
