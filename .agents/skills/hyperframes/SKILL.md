---
name: hyperframes_templates
description: Converte e adapta os templates de alta conversão do catálogo HyperFrames (HeyGen) para o ecossistema Remotion PRO do Lumiera, usando payloads JSON dinâmicos (customStyle) e componentes nativos de altíssima fidelidade.
---

# 🚀 Catálogo HyperFrames para Remotion PRO

Este guia descreve como mapear, converter e aplicar as diretrizes de design do catálogo **HyperFrames (HeyGen)** dentro do motor de renderização de alto desempenho **Remotion PRO** do Lumiera.

Em vez de usar templates fixos e engessados, o Lumiera utiliza o **Gemini** como um designer em tempo real, gerando estilos dinâmicos (`customStyle`) no payload JSON. Isto permite recriar qualquer bloco do catálogo HyperFrames com fidelidade extrema, código limpo e animações de alta performance (60 FPS).

---

## 🗺️ Mapeamento de Componentes (HyperFrames ➔ Remotion PRO)

Os blocos do HyperFrames se alinham perfeitamente com os 8 componentes nativos otimizados no diretório [overlays](file:///c:/Users/Leo/Documents/VIDEOS%20PROFISSIONAIS/LONGOS/LUMIERA/dashboard-qanat/remotion-renderer/src/overlays/):

| Bloco HyperFrames | Componente Remotion PRO | Estratégia de Customização |
| :--- | :--- | :--- |
| `x-post` / `reddit-post` | `InfoCard.tsx` | Fundo sólido escuro/claro, bordas finas, avatar do autor no lugar do ícone, e fontes geométricas (`Inter`). |
| `liquid-glass-notification` | `InfoCard.tsx` | Variante `glass` com `backdropFilter` intenso, bordas brancas translúcidas e sombras suaves. |
| `code-scroll` / `code-diff` | `InfoCard.tsx` | Variante `minimal` com fundo de terminal escuro (`#0f0f0f`), fonte mono-espaçada (`Courier New`) e tema `tech`. |
| `spotify-card` | `InfoCard.tsx` | Variante `floating` com gradiente escuro/verde, ícone `sparkles` e realce de borda neon. |
| `apple-money-count` | `InfoCounter.tsx` | Prefixo `$` ativo, animação física de mola (`spring`) e cores douradas ou verdes. |
| `data-chart` / `flowchart` | `InfoBar.tsx` | Barras animadas com gradientes dinâmicos de progresso e estatísticas. |
| `lt-soft-pill` / `lt-accent-underline` | `LowerThird.tsx` | Rodapés flutuantes com cantos hiper-arredondados (`borderRadius: "24px"`) ou barras finas com realce. |

---

## 🎨 Biblioteca de Design (Payloads JSON Prontos)

Aqui estão as configurações JSON que a IA utiliza para renderizar cada estilo do HyperFrames sob demanda:

### 1. 🐦 Estilo `x-post` (Twitter/X Overlay)
Ideal para citações rápidas, declarações de figuras famosas, relatos ou polêmicas.
```json
{
  "id": "x-post-1",
  "type": "info-card",
  "start": 1.5,
  "duration": 5.0,
  "props": {
    "title": "Elon Musk (@elonmusk)",
    "description": "O próximo foguete Starship está pronto para voar. O objetivo é a colonização de Marte.",
    "iconType": "sparkles",
    "position": "center-left",
    "accentColor": "#1DA1F2",
    "variant": "minimal",
    "theme": "tech",
    "customStyle": {
      "background": "#000000",
      "border": "1px solid #2f3336",
      "borderRadius": "16px",
      "boxShadow": "0 10px 40px rgba(0,0,0,0.5)",
      "fontFamilyTitle": "Inter",
      "fontFamilyDesc": "Inter",
      "colorTitle": "#FFF",
      "colorDesc": "#E7E9EA"
    }
  }
}
```

### 2. 🪟 Estilo `liquid-glass-notification` (macOS/iOS Glassmorphism)
Ideal para alertas de sistema, notificações urgentes, segredos ou curiosidades reveladas.
```json
{
  "id": "glass-notif-1",
  "type": "info-card",
  "start": 3.0,
  "duration": 4.5,
  "props": {
    "title": "SISTEMA ATIVADO",
    "description": "Inteligência artificial detectou uma anomalia nas ruínas sob o deserto.",
    "iconType": "warning",
    "position": "top-center",
    "accentColor": "#00E5FF",
    "variant": "glass",
    "theme": "tech",
    "customStyle": {
      "background": "rgba(255, 255, 255, 0.07)",
      "backdropFilter": "blur(20px)",
      "border": "1px solid rgba(255, 255, 255, 0.18)",
      "borderRadius": "24px",
      "boxShadow": "0 12px 40px rgba(0, 0, 0, 0.25)",
      "fontFamilyTitle": "Inter",
      "colorTitle": "#00E5FF",
      "colorDesc": "#FFFFFF"
    }
  }
}
```

### 3. 💻 Estilo `code-snippet-apple-terminal`
Perfeito para tutoriais de código, engenharia reversa, hacking ético ou automações de infraestrutura.
```json
{
  "id": "code-terminal-1",
  "type": "info-card",
  "start": 5.0,
  "duration": 6.0,
  "props": {
    "title": "terminal@lumiera:~$ python3",
    "description": ">>> import os\n>>> os.getenv('SECRET_KEY')\n'AQ.Ab8RN6KA6hIdOP...'",
    "iconType": "gear",
    "position": "bottom-right",
    "accentColor": "#00E676",
    "variant": "minimal",
    "theme": "tech",
    "customStyle": {
      "background": "#1e1e1e",
      "border": "1px solid #3c3c3c",
      "borderRadius": "12px",
      "boxShadow": "0 8px 32px rgba(0,0,0,0.4)",
      "fontFamilyTitle": "Courier New",
      "fontFamilyDesc": "Courier New",
      "colorTitle": "#00E676",
      "colorDesc": "#FFFFFF",
      "fontSizeDesc": 11
    }
  }
}
```

### 4. 💰 Estilo `apple-money-count` (Contador Financeiro)
Excelente para faturamento de empresas, riqueza histórica, custos de obras monumentais ou estatísticas monetárias.
```json
{
  "id": "money-count-1",
  "type": "info-counter",
  "start": 2.0,
  "duration": 4.0,
  "props": {
    "targetValue": 85000000,
    "prefix": "$",
    "suffix": " USD",
    "title": "CUSTO TOTAL DA OBRA",
    "accentColor": "#D4AF37",
    "customStyle": {
      "background": "linear-gradient(135deg, #120c02 0%, #3a2606 100%)",
      "border": "2px solid #D4AF37",
      "borderRadius": "20px",
      "boxShadow": "0 10px 30px rgba(212, 175, 55, 0.15)"
    }
  }
}
```

### 5. 🗞️ Estilo `news-ticker` (Rodapé de Noticiário)
Utilizado para dar contexto contínuo a vídeos históricos, atualizações de fatos rápidos ou clima de plantão jornalístico.
```json
{
  "id": "news-ticker-1",
  "type": "lower-third",
  "start": 0.0,
  "duration": 10.0,
  "props": {
    "title": "URGENTE",
    "subtitle": "Cientistas localizam o maior aquífero subterrâneo do planeta sob o Saara.",
    "accentColor": "#FF3D00",
    "position": "bottom-center",
    "customStyle": {
      "background": "#FF3D00",
      "colorTitle": "#FFFFFF",
      "colorDesc": "#FFFFFF",
      "borderRadius": "0px",
      "border": "none",
      "boxShadow": "0 -4px 20px rgba(255, 61, 0, 0.3)"
    }
  }
}
```

---

## 💡 Princípios Teóricos de Aplicação (Quando usar cada um?)

1. **Vídeos Históricos / Arqueológicos:**
   * **Visual:** Estilo pergaminho/realeza. Gradientes em tons de ouro (`#D4AF37`) ou terra (`#8B4513`), tipografia `'Cinzel'`, bordas duplas finas.
   * **Exemplo:** Fatos sobre o Império Romano ou mistérios das pirâmides.

2. **Vídeos de Tecnologia / Futurismo:**
   * **Visual:** Estilo holograma/cyber. Gradientes escuros com brilho neon ciano (`#00E5FF`) ou verde (`#00E676`), bordas tracejadas ou ultrafinas, cantos assimétricos (`borderRadius: "16px 2px"`).
   * **Exemplo:** Inteligência artificial, robótica ou astrofísica.

3. **Vídeos de Natureza / Viagem:**
   * **Visual:** Estilo orgânico/suave. Fundo verde floresta translúcido, cantos redondos generosos (`borderRadius: "24px"`), ícone `nature` ativo, tipografia `'Inter'` limpa.
   * **Exemplo:** Geologia do Grand Canyon ou florestas do Saara.

4. **Vídeos de Crime / Mistério:**
   * **Visual:** Estilo confidencial. Tons de roxo profundo (`#D500F9`) ou vermelho carmesim (`#FF3D00`), bordas rígidas (`0px`), sombras desfocadas.
   * **Exemplo:** Investigação policial ou conspirações antigas.

---

## 🤖 Regras de Ativação do Gemini
O agente de criação deve sempre analisar a temática do roteiro e injetar as propriedades CSS correspondentes no campo `customStyle` de acordo com a tabela de mood visual acima. Isso remove qualquer padrão engessado e garante que cada vídeo possua um design gráfico inteiramente customizado e único!
