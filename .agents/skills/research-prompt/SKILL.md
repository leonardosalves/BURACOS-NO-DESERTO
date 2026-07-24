---
name: research-prompt
description: Escreva um prompt de Pesquisa Profunda em parágrafo único para orientar um pesquisador humano ou IA de deep-research. Use quando o usuário pedir um brief de pesquisa, um "prompt de pesquisa profunda", uma instrução estruturada para pesquisar um tema, ou perguntar "o que nosso pesquisador deve investigar". Gera UM parágrafo denso com contexto completo, sub-perguntas numeradas e critérios de aceitação.
license: MIT
metadata:
  lumiera: true
  source: davidondrej/skills/skills/research-and-web/research-prompt
---

# Research Prompt (Construção de Briefs de Pesquisa)

Objetivo: Transformar uma necessidade genérica de pesquisa em **UM parágrafo autossuficiente** para que um pesquisador (humano ou agente de IA) possa agir sem ambiguidades e sem necessidade de idas e voltas.

## Diretrizes de Autoria (Regras de Ouro)

1. **Parágrafo Único:** O entregável final deve ser exatamente UM parágrafo contínuo e bem formatado. Sem cabeçalhos ou listas de marcadores no texto do prompt.
2. **Contexto Zero Prévio:** Assuma que o pesquisador nunca ouviu falar do projeto. Abra explicando o produto/projeto, por que ele existe e a situação atual.
3. **Objetivo + Decisão:** Declare a pergunta central que a pesquisa deve responder e a decisão prática que ela fundamentará.
4. **Sub-perguntas Numeradas Inline:** Inclua **3 a 6 sub-perguntas numeradas (1, 2, 3...)** dentro do parágrafo para garantir cobertura sistemática.
5. **Restrições de Escopo:** Especifique o que incluir e o que descartar (ex.: "apenas empresas ativas nos últimos 3 anos", "excluir comunicados de imprensa de marketing").
6. **Hierarquia de Fontes:** Exija fontes primárias (documentação técnica, dados oficiais, relatórios financeiros, artigos científicos). Fóruns e redes sociais só servem como sinal secundário.
7. **Tratamento de Contradições:** Se houver divergência entre fontes, exija a separação entre _fatos confirmados_, _inferências plausíveis_ e _incertezas não resolvidas_.
8. **Barra de Conclusão (Critério de Pronto):** Defina o momento exato em que a pesquisa é considerada concluída.

## Exemplo de Prompt Gerado

> Estamos desenvolvendo o sistema Lumiera para produção de vídeos documentais de alta retenção no YouTube e precisamos entender o estado da arte do renderizador Remotion v4 em ambientes serverless Docker para decidir nossa arquitetura de nuvem. Pesquise e traga evidências concretas respondendo: (1) qual é o tempo médio de renderização de um vídeo de 60s 1080p em instâncias AWS Fargate vs Lambda com suporte a GPU, (2) quais são os gargalos conhecidos de memória e concorrência no Chromium Headless sob alta carga, (3) qual é a estrutura de custos comparativa por 1.000 renders de vídeos de 1 minuto, e (4) quais plugins ou codecs são oficialmente suportados no container Alpine Linux oficial da Remotion. Priorize documentação oficial da Remotion, benchmarks publicados em repositórios do GitHub e relatórios de infraestrutura de produção; descarte especulações de fórum sem métricas reprodutíveis. Se as medições de custo variarem por região, apresente o intervalo com premissas claras de uso de CPU/RAM e marque hipóteses não verificadas. A pesquisa estará concluída quando tivermos uma tabela comparativa de throughput por dólar e uma recomendação de arquitetura baseada em dados reais.
