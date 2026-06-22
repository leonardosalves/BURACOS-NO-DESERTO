# Guia de Configuração: Receita de Vídeo Documentário Cinematográfico

Este documento serve como a **especificação técnica e receita de produção** utilizada para automatizar e criar vídeos documentários premium em 1080p a 60 FPS com áudio dinâmico e legendas interativas de alta retenção.

---

## 1. Legendas Dinâmicas de Alta Retenção (Formato ASS)

Para prender a atenção do espectador, as legendas devem seguir regras estritas de destaque palavra por palavra (*highlight hopping*) e contraste visual.

### Estilos Principais (Advanced SubStation Alpha)
*   **Default Style (Legendas de Narração):**
    *   **Fonte:** Arial, tamanho 48 (regular) ou Outfit/Inter (caso instaladas).
    *   **Cores:** Branco puro para texto padrão (`&H00FFFFFF`).
    *   **Posicionamento:** Alinhamento na parte inferior central (Alignment 2), margem vertical de 80 pixels.
    *   **Sombra/Borda:** Contorno preto sólido de 3 pixels com sombra leve de 2 pixels e fundo levemente translúcido (`&H80000000`).
*   **Impact Style (Títulos/Textos de Impacto no Centro):**
    *   **Fonte:** Arial Black ou Arial Bold, tamanho 72.
    *   **Cores:** Ouro/Amarelo (`&H0000C5FF`).
    *   **Posicionamento:** Alinhamento central absoluto (Alignment 5, meio da tela) para não sobrepor as legendas de rodapé.

### Lógica de Destaque Dinâmico (*Highlight Hopping*)
1.  **Limitação por Tela:** Máximo de **4 palavras por linha**. Quando a narração ultrapassar isso, quebre em uma nova linha.
2.  **Estado Ativo:** A palavra falada no milissegundo atual é destacada e aumentada de tamanho (`\fs58`), enquanto as outras palavras permanecem menores (`\fs48`).
3.  **Estado Inativo:** Todas as palavras não faladas da linha ficam levemente translúcidas (`\1a&H44&` - cerca de 73% de opacidade).
4.  **Esquema de Cores Ativas:**
    *   Se for uma **Palavra Normal**, destaca-se em **Azul Água** (`#80E0FF` / BGR BGC `&HFFE080&`).
    *   Se for uma **Palavra-Chave (Keyword)** relacionada ao tema (ex: *deserto, água, qanat, túnel, gravidade*), destaca-se em **Ouro** (`#FFC500` / BGR `&H00C5FF&`).

---

## 2. Configurações de Áudio e Ducking Dinâmico (Swells)

Para criar o contraste cinematográfico onde a música cresce nas pausas do narrador e diminui quando ele fala, o filtro de compressão sidechain do FFmpeg deve ser ajustado com precisão cirúrgica.

### Parâmetros de Sidechain Compression
No FFmpeg, combine a trilha de música (index `2`) com a narração (index `1`) usando o seguinte filtro:
```text
[2:a]volume=0.15[bgm];
[bgm][1:a]sidechaincompress=threshold=0.03:ratio=5.0:attack=100:release=1200[bgm_ducked];
[bgm_ducked][1:a]amix=inputs=2:normalize=0[aout]
```

*   **Volume Base da Música:** `0.15` (15% do volume original) para garantir que a música instrumental de alta energia nunca abafe a narração.
*   **Threshold (Limiar):** `0.03`. O compressor de sidechain é ativado imediatamente quando o áudio da narração sobe acima deste limiar muito baixo.
*   **Ratio (Razão):** `5.0`. Quando a voz entra, a música é comprimida por um fator de 5:1 (caindo para aproximadamente 3% do volume), deixando a voz perfeitamente limpa e audível.
*   **Attack (Ataque):** `100ms`. A música diminui quase instantaneamente ao primeiro sinal de voz.
*   **Release (Liberação/Swell):** `1200ms`. O segredo do *crescendo*: quando o narrador faz uma pausa, a música leva 1.2 segundos para retornar suavemente ao volume de 15%. Esse swell gradual preenche as pausas dramáticas de maneira profissional.

### Transições de Trilha (Crossfades)
Se houver múltiplas músicas ao longo do vídeo, elas devem ser cortadas de acordo com as seções (blocos) e sobrepostas em um buffer do numpy aplicando:
*   **Duração da Transição:** `2.0 segundos` de sobreposição entre blocos.
*   **Curva de Fade:** Linear ou cosseno aplicada no final do Bloco A (de 1.0 a 0.0) e no início do Bloco B (de 0.0 a 1.0) para eliminar estalos e transições bruscas de clima.

---

## 3. Movimentos de Câmera Estáveis e Suaves (Anti-Jitter)

Evite o filtro nativo `zoompan` do FFmpeg, pois ele utiliza aritmética de inteiros truncados para as coordenadas de corte, o que causa tremores severos (*jitter*) na tela.

### Solução via Pillow (Subpixel Translation)
Use scripts em Python para ler as imagens e fazer o redimensionamento usando interpolação bilinear ou lanczos com coordenadas de ponto flutuante:

```python
# Fator de escala muito suave por frame (t vai de 0.0 a 1.0)
if movement_type == 'zoom_in':
    scale = 1.0 + 0.04 * t # zoom de 1x a 1.04x
    w = crop_w / scale
    h = crop_h / scale
    x = cx
    y = cy
elif movement_type == 'pan_right':
    scale = 1.04
    w = crop_w / scale
    h = crop_h / scale
    max_shift = (crop_w - w) / 2.0
    x = cx - max_shift + 2.0 * max_shift * t
    y = cy

left = x - w / 2.0
top = y - h / 2.0
right = x + w / 2.0
bottom = y + h / 2.0

# O crop do Pillow aceita floats e interpola subpixels suavemente!
cropped = im.crop((left, top, right, bottom))
resized = cropped.resize((1920, 1080), Image.Resampling.BILINEAR)
```

---

## 4. Estrutura de Compilação do Script Orquestrador

Para os próximos vídeos, o script Python de orquestração deve seguir estes passos:
1.  **Leitura do Alinhamento de Palavras:** Carregar os carimbos de tempo da voz para gerar o arquivo `.ass` com a marcação dinâmica.
2.  **Distribuição de Duração Dinâmica:** Calcular a duração exata de cada bloco de narração e distribuir o tempo de forma proporcional entre os slides flexíveis (imagens) e slides fixos (vídeos/SVGs). Isso garante que o vídeo e a narração fiquem **100% sincronizados** até o final.
3.  **Processamento Paralelo:** Usar um `ThreadPoolExecutor` para processar cada pedaço do vídeo separadamente em paralelo, acelerando a renderização usando todos os núcleos da CPU.
4.  **Concatenação e Mixagem Final:** Chamar o FFmpeg com o comando `concat` para unir as cenas sem re-codificar o vídeo (rápido), aplicar a compressão sidechain do áudio e por fim queimar as legendas no vídeo final.
