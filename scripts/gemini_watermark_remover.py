import os
import sys
import argparse
import subprocess
import json

def log_msg(msg):
    print(f"[LOG] {msg}", flush=True)

def log_progress(percent, details=""):
    print(f"[PROGRESSO] {percent}% | {details}", flush=True)

def get_ffmpeg_binary():
    ff = os.environ.get("FFMPEG_BINARY")
    if ff and os.path.exists(ff):
        return ff
    candidates = [
        r"C:\Lumiera\tools\ffmpeg\bin\ffmpeg.exe",
        r"C:\ffmpeg\bin\ffmpeg.exe",
        "ffmpeg"
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return "ffmpeg"

def remove_watermark_opencv(input_path, output_path, watermark_pos="bottom_right", watermark_size=64):
    try:
        import cv2
        import numpy as np
    except ImportError:
        log_msg("OpenCV (cv2) ou NumPy não instalados. Redirecionando para fallback FFmpeg...")
        return False

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        log_msg(f"Erro ao abrir o vídeo com OpenCV: {input_path}")
        return False

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    log_msg(f"Vídeo aberto com sucesso: {width}x{height} @ {fps:.2f}fps, total {total_frames} frames")

    # Definir região do watermark (padrão Gemini: canto inferior direito)
    w_size = min(watermark_size, width // 4, height // 4)
    padding = 16

    if watermark_pos == "bottom_right":
        x1 = max(0, width - w_size - padding)
        y1 = max(0, height - w_size - padding)
        x2 = min(width, width - padding)
        y2 = min(height, height - padding)
    elif watermark_pos == "bottom_left":
        x1 = padding
        y1 = max(0, height - w_size - padding)
        x2 = min(width, padding + w_size)
        y2 = min(height, height - padding)
    else:
        # Default bottom-right
        x1 = max(0, width - w_size - padding)
        y1 = max(0, height - w_size - padding)
        x2 = min(width, width - padding)
        y2 = min(height, height - padding)

    rw = x2 - x1
    rh = y2 - y1

    if rw <= 0 or rh <= 0:
        log_msg("Dimensões de marca d'água inválidas.")
        cap.release()
        return False

    # Matriz de Alpha estimada para o logo semi-transparente do Gemini (Reverse Alpha Blending)
    # Criamos um gradiente gaussiano suave na ROI para blended Restoration
    y_indices, x_indices = np.ogrid[:rh, :rw]
    center_y, center_x = rh / 2.0, rw / 2.0
    dist_from_center = np.sqrt((x_indices - center_x)**2 + (y_indices - center_y)**2)
    radius = min(rw, rh) / 2.0

    # Alpha estimado (~0.35 max de opacidade da marca do Gemini)
    alpha = np.clip(1.0 - (dist_from_center / radius), 0, 1) ** 1.5 * 0.38
    alpha_3d = np.dstack([alpha] * 3)

    # Cor presumida da marca d'água (branca/cinza claro [245, 245, 245])
    watermark_color = np.array([245.0, 245.0, 245.0], dtype=np.float32)

    # Configurar VideoWriter com mp4v ou FFmpeg pipe
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    temp_out = output_path + ".tmp.mp4"
    out = cv2.VideoWriter(temp_out, fourcc, fps, (width, height))

    if not out.isOpened():
        log_msg("Não foi possível criar o arquivo temporário de saída com OpenCV VideoWriter. Usando fallback FFmpeg.")
        cap.release()
        return False

    frame_count = 0
    log_progress(0, f"Frame 0/{total_frames}")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1
        roi = frame[y1:y2, x1:x2].astype(np.float32)

        # Inversão matemática do blend: Original = (Blend - Watermark * Alpha) / (1 - Alpha)
        denom = np.maximum(1.0 - alpha_3d, 0.05)
        restored_roi = (roi - watermark_color * alpha_3d) / denom
        restored_roi = np.clip(restored_roi, 0, 255).astype(np.uint8)

        # Aplicar inpainting leve nas bordas para mesclagem invisível
        mask_inpaint = (alpha * 255).astype(np.uint8)
        restored_roi_smooth = cv2.inpaint(restored_roi, mask_inpaint, 3, cv2.INPAINT_TELEA)

        frame[y1:y2, x1:x2] = restored_roi_smooth
        out.write(frame)

        if total_frames > 0 and (frame_count % 15 == 0 or frame_count == total_frames):
            pct = int((frame_count / total_frames) * 100)
            log_progress(pct, f"Frame {frame_count}/{total_frames}")

    cap.release()
    out.release()

    # Re-codificar vídeo em H.264 (libx264, yuv420p) para ser reproduzível no HTML5 <video> do navegador
    ffmpeg_exe = get_ffmpeg_binary()
    cmd = [
        ffmpeg_exe, "-y",
        "-i", temp_out,
        "-i", input_path,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-crf", "18",
        "-c:a", "aac",
        "-map", "0:v:0",
        "-map", "1:a:0?",
        output_path
    ]
    log_msg("Re-codificando container em H.264 (HTML5 compatível) com FFmpeg...")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    if os.path.exists(temp_out):
        try:
            os.remove(temp_out)
        except Exception:
            pass

    if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
        log_progress(100, "Concluído com Reverse Alpha Blending OpenCV!")
        return True
    else:
        log_msg("Falha ao salvar vídeo final com OpenCV. Tentando fallback FFmpeg...")
        return False

def get_video_resolution(input_path):
    ffmpeg_exe = get_ffmpeg_binary()
    ffprobe_exe = ffmpeg_exe.replace("ffmpeg.exe", "ffprobe.exe").replace("ffmpeg", "ffprobe")
    cmd = [
        ffprobe_exe, "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "json",
        input_path
    ]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        data = json.loads(res.stdout)
        stream = data["streams"][0]
        return int(stream["width"]), int(stream["height"])
    except Exception:
        return 1080, 1920

def remove_watermark_ffmpeg_fallback(input_path, output_path, watermark_size=64):
    log_msg("Executando remoção de marca d'água via FFmpeg delogo filter...")
    ffmpeg_exe = get_ffmpeg_binary()

    width, height = get_video_resolution(input_path)
    w_box = max(60, min(watermark_size + 26, width // 4))
    h_box = max(60, min(watermark_size + 26, height // 4))
    x_pos = max(0, width - w_box - 16)
    y_pos = max(0, height - h_box - 16)

    vf_filter = f"delogo=x={x_pos}:y={y_pos}:w={w_box}:h={h_box}"
    log_msg(f"Resolução detectada: {width}x{height} | ROI delogo: {w_box}x{h_box} em ({x_pos}, {y_pos})")

    cmd = [
        ffmpeg_exe, "-y",
        "-i", input_path,
        "-vf", vf_filter,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-crf", "18",
        "-c:a", "copy",
        output_path
    ]

    log_msg(f"Comando FFmpeg: {' '.join(cmd)}")
    log_progress(10, "Iniciando codificação FFmpeg delogo...")

    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True)

    for line in process.stdout:
        line_str = line.strip()
        if "frame=" in line_str or "time=" in line_str:
            log_msg(f"FFmpeg: {line_str}")

    process.wait()

    if process.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
        log_progress(100, "Concluído via FFmpeg delogo!")
        return True
    else:
        log_msg(f"FFmpeg retornou código de erro: {process.returncode}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Removedor de Watermark Gemini (Reverse Alpha Blending)")
    parser.add_argument("--input", required=True, help="Caminho do vídeo original")
    parser.add_argument("--output", required=True, help="Caminho do vídeo sem marca d'água")
    parser.add_argument("--pos", default="bottom_right", help="Posição da marca d'água")
    parser.add_argument("--size", type=int, default=64, help="Tamanho da marca d'água em pixels")

    args = parser.parse_args()

    input_path = os.path.abspath(args.input)
    output_path = os.path.abspath(args.output)

    if not os.path.exists(input_path):
        log_msg(f"ERRO: Arquivo de entrada não existe: {input_path}")
        sys.exit(1)

    log_msg(f"Iniciando remoção de marca d'água Gemini em: {os.path.basename(input_path)}")
    log_progress(5, "Analisando estrutura do vídeo...")

    success = remove_watermark_opencv(input_path, output_path, watermark_pos=args.pos, watermark_size=args.size)
    if not success:
        success = remove_watermark_ffmpeg_fallback(input_path, output_path, watermark_size=args.size)

    if success and os.path.exists(output_path):
        log_msg(f"SUCESSO! Vídeo salvo em: {output_path}")
        sys.exit(0)
    else:
        log_msg("ERRO FATAL: Falha ao processar o vídeo com todos os métodos disponíveis.")
        sys.exit(1)

if __name__ == "__main__":
    main()
