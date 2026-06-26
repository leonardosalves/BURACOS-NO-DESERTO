---
name: hyperframes_templates
description: Converte e adapta os templates de alta conversão do catálogo HyperFrames (HeyGen) para o ecossistema Remotion PRO do Lumiera, usando payloads JSON dinâmicos (customStyle) e componentes nativos de altíssima fidelidade.
---

# 🚀 Catálogo HyperFrames Expandido para Remotion PRO

Este documento serve como o manual definitivo de design e catálogo de referências para a criação de overlays ultra-premium orquestrados por IA no Lumiera, inspirados no catálogo **HyperFrames (HeyGen)** (https://hyperframes.heygen.com/catalog/).

A IA (Gemini) utiliza estes padrões e configurações de payloads para planejar, estilizar e renderizar componentes com mola física, tipografia refinada e designs dinâmicos ("desingessados") adaptados ao assunto de cada vídeo.

---

## 🗺️ Mapeamento de Componentes (HyperFrames ➔ Remotion PRO)

| Bloco HyperFrames | Componente Remotion PRO | Estratégia de Customização e Variantes |
| :--- | :--- | :--- |
| `reddit-post` / `x-post` | `InfoCard.tsx` | Variante `minimal` com fundo escuro, avatar simulado e fonte geométrica `Inter`. |
| `tiktok-comment` / `ig-comment` | `InfoCard.tsx` | Variante `glass` com molduras finas, cantos bem arredondados (`20px`) e badges coloridos. |
| `liquid-glass-notification` | `InfoCard.tsx` | Variante `glass` com `backdropFilter` intenso, bordas translúcidas e sombras suaves. |
| `spotify-card` / `music-player` | `InfoCard.tsx` | Variante `floating` com gradientes vibrantes, sombras brilhantes neon e ícones animados. |
| `apple-money-count` / `stats` | `InfoCounter.tsx` | Display numérico com animação física de mola (`spring`), prefixos e sufixos customizados. |
| `data-chart` / `flowchart` | `InfoBar.tsx` | Barras de dados verticais/horizontais com gradientes de progresso e estatísticas. |
| `lt-soft-pill` / `lt-accent-bar` | `LowerThird.tsx` | Rodapés flutuantes com cantos assimétricos ou tags de destaque. |
| `split-grid-block` | `InfoCard.tsx` | Estruturação de fatos-chave em cartões com divisórias internas via CSS. |

---

## 🎨 Biblioteca Real-Time de Templates (Payloads JSON)

A IA deve selecionar e adaptar estas configurações estruturais para injetar estilos premium e temáticos:

### 1. 💬 Caption Social Overlays (Comentários e Posts de Redes Sociais)

#### A. 🎥 Estilo `tiktok-comment` (Comentário do TikTok)
Perfeito para vídeos de engajamento, relatos do público, dúvidas frequentes ou interação com a comunidade.
```json
{
  "id": "tiktok-comment-1",
  "type": "info-card",
  "start": 1.0,
  "duration": 4.5,
  "props": {
    "title": "@lucas_silva • 2h atrás",
    "description": "Cara, isso faz muito sentido! O concreto romano era praticamente indestrutível comparado ao nosso.",
    "iconType": "sparkles",
    "position": "center-left",
    "accentColor": "#FE2C55",
    "variant": "glass",
    "theme": "classic",
    "customStyle": {
      "background": "rgba(18, 18, 18, 0.85)",
      "backdropFilter": "blur(15px)",
      "border": "1px solid rgba(254, 44, 85, 0.3)",
      "borderRadius": "20px",
      "boxShadow": "0 10px 30px rgba(0, 0, 0, 0.3), 0 0 15px rgba(254, 44, 85, 0.15)",
      "fontFamilyTitle": "Inter",
      "fontFamilyDesc": "Inter",
      "colorTitle": "#FE2C55",
      "colorDesc": "#FFFFFF",
      "fontSizeTitle": 11,
      "fontSizeDesc": 10
    }
  }
}
```

#### B. 🤖 Estilo `reddit-post-card` (Discussão do Reddit)
Ideal para teorias da conspiração, debates intelectuais, curiosidades científicas ou histórias de mistério.
```json
{
  "id": "reddit-thread-1",
  "type": "info-card",
  "start": 4.0,
  "duration": 6.0,
  "props": {
    "title": "r/HojeEuAprendi • p/u/CuriosoMental",
    "description": "HEA que os astronautas da Apollo 11 não conseguiram fazer seguro de vida, então assinaram centenas de autógrafos para que suas famílias os vendessem caso morressem.",
    "iconType": "book",
    "position": "top-center",
    "accentColor": "#FF4500",
    "variant": "minimal",
    "theme": "mysterious",
    "customStyle": {
      "background": "#1A1A1B",
      "border": "1.5px solid #343536",
      "borderRadius": "14px",
      "boxShadow": "0 15px 45px rgba(0,0,0,0.6)",
      "fontFamilyTitle": "Inter",
      "fontFamilyDesc": "Inter",
      "colorTitle": "#FF4500",
      "colorDesc": "#D7DAD8",
      "fontSizeTitle": 10,
      "fontSizeDesc": 11
    }
  }
}
```

#### C. 📸 Estilo `instagram-comment-bubble`
Excelente para citações de famosos, depoimentos rápidos ou testemunhos.
```json
{
  "id": "ig-comment-1",
  "type": "info-card",
  "start": 2.5,
  "duration": 4.5,
  "props": {
    "title": "mariah_costa Verified",
    "description": "Absolutamente genial! A ciência por trás disso é fascinante. 👏🔥",
    "iconType": "heart",
    "position": "bottom-left",
    "accentColor": "#E1306C",
    "variant": "glass",
    "theme": "classic",
    "customStyle": {
      "background": "rgba(255, 255, 255, 0.08)",
      "backdropFilter": "blur(25px)",
      "border": "1px solid rgba(255, 255, 255, 0.2)",
      "borderRadius": "24px 24px 24px 4px",
      "boxShadow": "0 8px 32px rgba(225, 48, 108, 0.15)",
      "fontFamilyTitle": "Inter",
      "colorTitle": "#E1306C",
      "colorDesc": "#FFFFFF",
      "fontSizeTitle": 11,
      "fontSizeDesc": 10
    }
  }
}
```

---

### 2. 🏷️ Lower Thirds (Identificações e Tags de Destaque)

#### A. 💊 Estilo `lt-soft-pill` (Pílula Flutuante)
Design arredondado, ideal para identificar locais históricos, nomes de cientistas ou tópicos em debate.
```json
{
  "id": "lt-pill-1",
  "type": "lower-third",
  "start": 0.8,
  "duration": 4.0,
  "props": {
    "title": "PROF. CARLOS MENDES",
    "subtitle": "Diretor de Arqueologia da USP",
    "accentColor": "#00FF87",
    "position": "bottom-left",
    "customStyle": {
      "background": "linear-gradient(90deg, rgba(10, 25, 15, 0.95) 0%, rgba(5, 15, 10, 0.7) 100%)",
      "border": "1.5px solid #00FF87",
      "borderRadius": "40px",
      "boxShadow": "0 8px 24px rgba(0, 255, 135, 0.2)",
      "colorTitle": "#00FF87",
      "colorDesc": "#A0AEC0",
      "fontFamilyTitle": "Montserrat"
    }
  }
}
```

#### B. ➖ Estilo `lt-accent-underline` (Barra de Destaque Minimalista)
Visual corporativo ou militar, com linha fina neon na borda esquerda ou na base.
```json
{
  "id": "lt-accent-1",
  "type": "lower-third",
  "start": 1.2,
  "duration": 3.8,
  "props": {
    "title": "PROJETO MANHATTAN",
    "subtitle": "Los Alamos, Novo México - 1945",
    "accentColor": "#FF3D00",
    "position": "bottom-left",
    "customStyle": {
      "background": "rgba(10, 10, 10, 0.9)",
      "borderLeft": "4px solid #FF3D00",
      "borderRadius": "0px 8px 8px 0px",
      "boxShadow": "0 4px 20px rgba(0, 0, 0, 0.5)",
      "fontFamilyTitle": "Oswald",
      "colorTitle": "#FF3D00",
      "colorDesc": "#E2E8F0"
    }
  }
}
```

---

### 3. 📊 Data & Infographics (Estatísticas, Gráficos e Contadores)

#### A. 📈 Estilo `multiple-bar-comparison` (Gráfico de Barras de Dados)
Permite comparar grandezas físicas, faturamentos, populações ou recordes.
```json
{
  "id": "bar-comparison-1",
  "type": "bar-chart",
  "start": 5.5,
  "duration": 6.5,
  "props": {
    "title": "VELOCIDADE MÁXIMA DE OPERAÇÃO",
    "items": [
      { "label": "Trem Bala (Shinkansen)", "value": 320, "displayValue": "320 km/h", "color": "#00E5FF" },
      { "label": "Protótipo Maglev L0", "value": 603, "displayValue": "603 km/h", "color": "#00FF87" }
    ],
    "accentColor": "#00FF87",
    "position": "bottom-center",
    "theme": "tech",
    "customStyle": {
      "background": "linear-gradient(135deg, #020b14 0%, #051829 100%)",
      "border": "2px solid #00E5FF",
      "borderRadius": "16px",
      "boxShadow": "0 10px 40px rgba(0, 229, 255, 0.25)",
      "fontFamilyTitle": "Oswald",
      "colorTitle": "#00E5FF"
    }
  }
}
```

#### B. 🎯 Estilo `percentage-stats-gauge` (Indicador de Percentual)
Excelente para enfatizar porcentagens impressionantes de probabilidade, eficiência ou demografia.
```json
{
  "id": "percentage-stats-1",
  "type": "counter",
  "start": 8.0,
  "duration": 4.5,
  "props": {
    "value": 98,
    "label": "Eficiência térmica de novos reatores de fusão",
    "suffix": "%",
    "formatNumber": false,
    "accentColor": "#00FF87",
    "position": "top-right",
    "theme": "tech",
    "customStyle": {
      "background": "rgba(5, 20, 10, 0.96)",
      "border": "2.5px solid #00FF87",
      "borderRadius": "24px 4px",
      "boxShadow": "0 0 35px rgba(0, 255, 135, 0.35)",
      "colorValue": "#00FF87",
      "fontSizeValue": 36,
      "fontFamilyValue": "Courier New"
    }
  }
}
```

---

### 4. 🎴 Visual Showcases & Mockups (Destaques e Molduras de Imagem)

#### A. 📱 Estilo `product-highlight-card` (Exibição com Moldura Neon)
Ideal para destacar uma descoberta científica, artefato histórico, ou um segredo confidencial.
```json
{
  "id": "showcase-card-1",
  "type": "info-card",
  "start": 12.0,
  "duration": 5.5,
  "props": {
    "title": "Mecanismo de Anticítera",
    "description": "O primeiro computador analógico da humanidade, datado de 150 a.C. Ele previa eclipses com precisão astronômica.",
    "iconType": "compass",
    "position": "center-right",
    "accentColor": "#D4AF37",
    "variant": "accent",
    "theme": "ancient",
    "customStyle": {
      "background": "linear-gradient(135deg, #1A0F05 0%, #3D230A 100%)",
      "border": "3px double #D4AF37",
      "borderRadius": "0px",
      "boxShadow": "0 15px 50px rgba(212, 175, 55, 0.3)",
      "fontFamilyTitle": "Cinzel",
      "fontFamilyDesc": "Cinzel",
      "colorTitle": "#D4AF37",
      "colorDesc": "#FFF9E6"
    }
  }
}
```

---

### 5. ⚡ Advanced Effects & Transitions (Transições, Brilhos e Scanlines)

#### A. 🛸 Estilo `tech-scanline-hologram` (Glow Neon Pulsante com Fontes Rígidas)
Para assuntos militares, tecnologia espacial ou conspirações alienígenas.
```json
{
  "id": "hologram-effect-1",
  "type": "info-card",
  "start": 6.5,
  "duration": 5.0,
  "props": {
    "title": "ARQUIVO CLASS. CONFIDENCIAL",
    "description": "Operações secretas conduzidas no Setor 4 durante a Guerra Fria. Documentação parcialmente destruída em 1974.",
    "iconType": "warning",
    "position": "bottom-center",
    "accentColor": "#FF1744",
    "variant": "accent",
    "theme": "industrial",
    "customStyle": {
      "background": "rgba(20, 5, 8, 0.95)",
      "border": "2px solid #FF1744",
      "borderRadius": "4px",
      "boxShadow": "0 0 35px rgba(255, 23, 68, 0.4), inset 0 0 15px rgba(255, 23, 68, 0.2)",
      "fontFamilyTitle": "Courier New",
      "fontFamilyDesc": "Courier New",
      "colorTitle": "#FF1744",
      "colorDesc": "#FFEBEE",
      "fontSizeTitle": 12,
      "fontSizeDesc": 10
    }
  }
}
```

---

### 6. 🔲 Modular Blocks & Facts (Mosaicos, Listas e Painéis Estruturados)

#### A. 🔢 Estilo `step-by-step-sequence` (Painel com Passos Sequenciais)
Ideal para estruturar processos, etapas históricas ou instruções passo a passo.
```json
{
  "id": "step-sequence-1",
  "type": "timeline",
  "start": 15.0,
  "duration": 8.0,
  "props": {
    "title": "PROCESSO DE MUMIFICAÇÃO EGÍPCIA",
    "events": [
      { "year": "Etapa 1", "description": "Remoção dos órgãos internos e secagem com natrão por 40 dias.", "highlight": false },
      { "year": "Etapa 2", "description": "Aplicação de resinas perfumadas e óleos vegetais.", "highlight": false },
      { "year": "Etapa 3", "description": "Enfaixamento completo com centenas de metros de linho.", "highlight": true }
    ],
    "accentColor": "#D4AF37",
    "orientation": "horizontal",
    "theme": "ancient",
    "customStyle": {
      "background": "rgba(18, 12, 6, 0.97)",
      "border": "2px solid #D4AF37",
      "borderRadius": "18px",
      "boxShadow": "0 10px 40px rgba(212, 175, 55, 0.2)",
      "fontFamilyTitle": "Cinzel",
      "colorTitle": "#D4AF37"
    }
  }
}
```

#### B. 🏛️ Estilo `key-facts-highlights` (Painel de Fatos Históricos Fundamentais)
Permite expor verdades consolidadas de forma limpa e impactante.
```json
{
  "id": "key-facts-1",
  "type": "info-card",
  "start": 9.5,
  "duration": 5.5,
  "props": {
    "title": "A GRANDE MURALHA DA CHINA",
    "description": "Fatos Rápidos:\n• Comprimento: Mais de 21.000 km\n• Período de Construção: Mais de 2.000 anos\n• Principal Objetivo: Proteção contra invasões nômades",
    "iconType": "shield",
    "position": "center-left",
    "accentColor": "#FF3D00",
    "variant": "glass",
    "theme": "classic",
    "customStyle": {
      "background": "rgba(10, 10, 12, 0.95)",
      "border": "1.5px solid rgba(255, 61, 0, 0.4)",
      "borderRadius": "24px",
      "boxShadow": "0 12px 36px rgba(0, 0, 0, 0.5)",
      "fontFamilyTitle": "Oswald",
      "fontFamilyDesc": "Inter",
      "colorTitle": "#FF3D00",
      "colorDesc": "#F7FAFC"
    }
  }
}
```

---

## 🤖 Regras de Orquestração do Gemini

O modelo de Inteligência Artificial deve atuar como o **Designer Chefe** e seguir rigorosamente estas diretrizes ao planejar os overlays de cada vídeo:

1. **Seleção de Tema Visual**: Avalie o tema do vídeo (Arqueologia = `ancient`, Tecnologia/Futuro = `tech`, Natureza = `nature`, Corporativo/Ciência Geral = `classic`, Mistério = `mysterious`, Industrial = `industrial`).
2. **Customização Extrema (`customStyle`)**: Sempre preencha o objeto `customStyle` no JSON gerado. A IA é proibida de usar layouts padrão rígidos. Ela deve inventar gradientes, definir raios de borda assimétricos (ex: `borderRadius: "32px 4px"`), configurar bordas decorativas (ex: `border: "3px double #D4AF37"`) e glows neon no `boxShadow` baseados estritamente nas referências do catálogo HyperFrames acima.
3. **Mapeamento Social**: Quando o roteiro citar debates, opiniões públicas ou declarações diretas de personalidades, opte imediatamente pelos layouts sociais (`x-post`, `reddit-post`, `tiktok-comment` ou `instagram-comment`), preenchendo o avatar simulado e a estrutura do autor.
4. **Respeito Visual**: Os layouts de texto devem ter fontes adequadas (`Cinzel` para antigo, `Courier New` para código/tech, `Oswald` para industrial/dados, `Inter` ou `Montserrat` para legibilidade moderna).
