# Inteligência competitiva (concorrentes)

> 🔗 [[MEMORIA-LUMIERA]] · [[skills/viral-short-form-ideas|viral short form ideas]] · [[skills/viral-hooks|viral hooks]] · [[skills/viral-captions-and-ctas|viral captions and ctas]] · [[skills/content-strategy|content strategy]]

## Meta
niche: (preencher por canal — ex. construção / curiosidades históricas)
updated: 2026-07-01
purpose: minerar o que funciona nos concorrentes → ideias originais no Lumiera (nunca cópia frame-a-frame)

## Regra de ouro

| Estudar | Não copiar |
|---------|------------|
| **Mecânica** (listicle, comparação, revelação, custo, deadline) | Título palavra por palavra |
| **Packaging** (thumb, 3 palavras na tela, duração) | Roteiro inteiro |
| **Ritmo** (cortes a cada Xs, pattern interrupt) | Voz / estética do criador |
| **CTA que converte** (comentário fixo, pergunta específica) | Hashtag genérica |

Um outlier isolado = dado. A **mesma mecânica em 3+ canais** = formato adaptável.

---

## Quem monitorar (lista viva)

| Canal | Nicho | Tamanho | URL | Notas |
|-------|-------|---------|-----|-------|
| | | | | |
| | | | | |
| | | | | |

Critério: **seu tamanho ou 1 tier acima** — não só os gigantes (sinal diluído).

---

## Ficha de dissecção (por vídeo outlier)

Preencher quando views ≥ **3–4×** a média do canal deles.

```markdown
### [Título do vídeo]
- **Canal:**
- **videoId / URL:**
- **Views / idade / duração:**
- **Outlier?** (vs média do canal: ___)

#### Hook (0–3s)
- Visual (1º frame):
- Verbal (1ª frase):
- Texto na tela:
- Arquétipo: contrarian | choque | número | custo | pergunta | ...

#### Estrutura
- Formato: listicle | storytelling | antes/depois | mito vs realidade | ...
- Blocos / beats (timestamps):
- Open loops (onde prende):
- Pattern interrupts (~8–12s em Short):

#### Retenção & payoff
- O que o gancho prometeu:
- Onde entrega (ou trai — evitar isso):

#### CTA
- Último bloco / comentário fixo:
- Tipo: pergunta | desafio | parte 2 | link descrição | save | ...

#### Packaging
- Thumb (3–5 palavras, rosto?, contraste):
- Título pesquisável vs curiosidade:

#### Mecânica extraída (1 linha)
> Ex.: "Ranking #5→#1 com fato impossível no item 1"

#### Ideia Lumiera derivada (SEU ângulo)
- Título candidato:
- Gancho em PT:
- Por que não é cópia:
- Pilar: impactful | practical | provocative | astonishing
```

---

## De outlier → ideia no Creator (matriz de adaptação)

1. **Tópico deles** → **seu pilar** (história, engenharia, cotidiano…)
2. **Mecânica** → mantém
3. **Superfície** → troca (nomes, época, objeto, país)
4. **Gancho** → reescreve com `viral-hooks` (6–10 opções, 3 camadas)
5. **Validação barata** → 1 linha no swipe / comentário fixo teste → só então roteiro

Exemplos de transplante de mecânica:

| Mecânica concorrente | Seu ângulo (construção/história) |
|--------------------|----------------------------------|
| "X vs Y — qual sobrevive?" | "Argamassa romana vs concreto moderno — teste de 48h" |
| "3 coisas que ninguém te conta" | "3 falhas que derrubaram pontes famosas" |
| "Isso é ilegal hoje" | "Esta técnica de obra era normal em 1920" |
| Ranking com twist no #1 | Top 5 máquinas antigas — #1 ainda funciona |

---

## Loop semanal (45 min — sexta ou domingo)

Baseado em `mining-checklist.md` + foco concorrentes.

| Bloco | Tempo | Ação |
|-------|-------|------|
| Outliers | 15 min | 3 canais → 1 outlier cada → só **mecânica** |
| Dissecção | 15 min | 1 ficha completa (o mais forte) |
| Derivação | 10 min | 3 ideias Lumiera + 1 gancho cada |
| Memória | 5 min | Promover padrão se repetir 2× |

**Promover para memória permanente** (esta nota ou `memory/historia.md` etc.):

- Mecânica que funcionou em **≥2 concorrentes**
- Gancho verbal que você testou e **reteve > média**
- CTA que gerou **comentários** no seu canal
- Erro recorrente dos concorrentes (ângulo livre para você)

**Swipe file temporário** (não promover): títulos soltos, thumbs bonitas sem mecânica clara.

---

## Integração Lumiera

### 1. NotebookLM (pesquisa + concorrentes)
- Criar notebook do nicho com: 5–10 URLs de vídeos outlier (YouTube como fonte)
- Prompts já pedem: *erros de concorrentes*, *ângulos ignorados*, *mitos* (`notebooklmService.js`)
- Exportar resumo → colar na ficha ou no Creator como contexto

### 2. Creator (ideias e roteiro)
- Pedir: *"20 ideias no pilar X inspiradas na mecânica [comparação], não no tópico [café]"*
- Skills: `viral-short-form-ideas`, `viral-hooks`, `ugc-scriptwriter`
- Campos: `hook_candidates`, `viral_category`, `why_it_works`

### 3. Canal YouTube → Studio Pro
- **SEO nos comentários**: palavras que a audiência repete → títulos
- **Ideias (comentários)** em Ferramentas → Creator
- Vídeos quentes 48h seus = validação; concorrentes = hipótese

### 4. Após publicar (fechar o loop)
- Seu outlier → ficha interna (não só concorrente)
- Comentários top → próximo vídeo (`mining.md` § comentários)

---

## O que registrar no Obsidian (checklist pós-sessão)

- [ ] Atualizar tabela **Quem monitorar**
- [ ] 1× ficha de dissecção nova
- [ ] 3× `Ideia Lumiera derivada` com status: inbox | script | publicado
- [ ] Se mecânica repetiu: bloco em **Padrões promovidos** (abaixo)
- [ ] Link `[[memory/historia]]` ou nicho correto se for fato reutilizável

## Padrões promovidos (concorrentes → nosso formato)

- (nenhum ainda — promover quando mecânica + resultado confirmado 2×)

## Erros dos concorrentes (nosso diferencial)

- Generalidade sem número/data/nome
- Gancho que o corpo não paga
- Listicle sem payoff no #1
- CTA engagement bait ("like se concorda")

## Candidatos em observação

- 

---

## Anti-patterns

- Copiar título + thumb + roteiro do mesmo vídeo
- Estudar só canais 10× maiores (formato não portável)
- Salvar 50 outliers sem dissecar 1
- Ideia derivada sem `why_it_works` escrito

## Links úteis no repo

- `skills/viral-short-form-ideas/references/mining.md` — § Competitor outlier
- `skills/viral-short-form-ideas/assets/mining-checklist.md`
- `skills/viral-short-form-ideas/references/anti-patterns.md` — cópia vs estudo
- `skills/viral-captions-and-ctas/references/ctas-that-work.md`