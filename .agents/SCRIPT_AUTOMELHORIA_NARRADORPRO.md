# SCRIPT_AUTOMELHORIA_NARRADORPRO

## PROPÓSITO

Executar auto-auditoria estruturada em cada narração produzida,
identificar padrões de erro recorrentes e propor correções antes da entrega.

## GATILHO

Executar automaticamente após a ETAPA 11 (Validar Narração) e antes da
ETAPA 12 (Validar Entrega).

## PROCEDIMENTO

### FASE 1 — VARREDURA DE PORTÕES (obrigatória)

Para cada portão da seção 9, responder SIM ou NÃO:

```
P01_ABSTRATO: Existe frase sem mecanismo/evidência/consequência? [ ]
P02_FUSAO: Dois fatos de entidades diferentes foram fundidos? [ ]
P03_GANCHO: O gancho promete algo que o texto NÃO responde? [ ]
P04_EXCESSO: Há mais fatos do que o texto consegue explicar? [ ]
P05_JARGAO: Termo técnico sem explicação na 1ª menção? [ ]
P06_LISTA: Lista de aplicações sem função narrativa? [ ]
P07_FINAL: O final apenas repete o gancho? [ ]
P08_GRANDEZA: Fechamento com "símbolo/legado/progresso" sem consequência? [ ]
P09_TESE: Tese sem objeto+mecanismo+consequência? [ ]
P10_DADO: Dado sem unidade/período/referência/contexto? [ ]
P11_GENERICO: Frase que serviria para qualquer tema? [ ]
P12_ESCOPO: História maior que a duração permite? [ ]
P13_VAZIO: Frase escrita apenas para soar grandiosa? [ ]
P14_FONTE: Afirmação histórica sem fonte suficiente? [ ]
P15_CAUSAL: Sem conexão causal explícita entre blocos? [ ]
```

Se TODOS = NÃO → prosseguir para FASE 2.
Se ALGUM = SIM → protocolo de recuperação (seção 13 do NarradorPRO).

### FASE 2 — AUDITORIA ORAL RÁPIDA

Ler o texto em voz alta (mentalmente). Marcar:

- [ ] Frases > 25 palavras: quantas? ___ (máx. 1 por bloco em Shorts)
- [ ] 3+ números na mesma frase: existe? [ ]
- [ ] Ritmo uniforme (3+ frases seguidas com mesmo comprimento): [ ]
- [ ] Palavra difícil de pronunciar próxima de outra: [ ]
- [ ] Sujeito a > 8 palavras do verbo: [ ]

Se algum item marcado → reescrever a frase específica.

### FASE 3 — TESTE DE DENSIDADE POR BLOCO

Para cada bloco da estrutura proporcional:

```
BLOCO: [gancho|contexto|desenvolvimento|escalada|recompensa|fechamento]
PALAVRAS: ___
FAIXA ESPERADA: ___
FUNÇÃO CUMPRIDA: [sim|não]
INFORMAÇÃO NOVA: [sim|não]
```

Se bloco está fora da faixa em > 30% → redistribuir.
Se bloco não cumpre função ou não traz informação nova → comprimir/remover.

### FASE 4 — TESTE DO ESPECTADOR CÉTICO

Perguntar para cada afirmação de impacto:

"Se eu fosse um espectador que nunca ouviu falar disso, eu entenderia
COMO isso aconteceu apenas com o que foi dito?"

Se a resposta for NÃO para qualquer afirmação → inserir mecanismo ou
exemplo antes da afirmação.

### FASE 5 — VERIFICAÇÃO DE BLOCK_PHRASE

Para cada bloco com block_phrase:

```
BLOCK_PHRASE: "___"
INÍCIO REAL: "___"
IDÊNTICO: [sim|não]
ÚNICO NO ROTEIRO: [sim|não]
4-8 PALAVRAS: [sim|não]
```

Se NÃO em qualquer campo → corrigir.

### FASE 6 — CONTAGEM E FORMATO

```
PALAVRAS TOTAIS: ___
DURAÇÃO ALVO: ___s
FAIXA ESPERADA: ___–___ palavras
DENTRO DA FAIXA: [sim|não]
FORMATO CORRETO (Shorts/Longo): [sim|não]
FECHAMENTO DECLARATIVO: [sim|não]
CTA (se solicitado): [sim|não|N/A]
```

### FASE 7 — DECISÃO FINAL

- Se FASES 1–6 passaram → ENTREGAR.
- Se 1–2 itens falharam → CORRIGIR pontualmente, re-rodar fase específica.
- Se 3+ itens falharam → PROTOCOLO DE RECUPERAÇÃO completo.
- Se kill criteria atingido → RECOMEÇAR da ETAPA 1.

## REGISTRO (interno, não incluído na saída)

Após cada execução, registrar:

- Portões que falharam com mais frequência
- Tipo de erro recorrente (fusão, abstração, genericidade, ritmo)
- Ajuste aplicado

Este registro alimenta melhoria contínua nas próximas execuções.
