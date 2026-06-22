import os
import cv2
import numpy as np
import math
import subprocess

def main():
    img_path = 'ASSETS/images/img_32.jpeg'
    output_dir = 'temp_highlight'
    clip_output = 'temp_clips/clip_highlight.mp4'
    
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs('temp_clips', exist_ok=True)
    
    print(f"Loading base image {img_path} for infographic overlay...")
    img = cv2.imread(img_path)
    if img is None:
        raise FileNotFoundError(f"Could not load image: {img_path}")
        
    # Scale base image to 2560x1440 for high-quality drawing and zooming
    base_img = cv2.resize(img, (2560, 1440), interpolation=cv2.INTER_LANCZOS4)
    
    # 1. Detect green coordinates (oasis) on the 2560x1440 image
    g = base_img[:, :, 1].astype(int)
    r = base_img[:, :, 0].astype(int)
    b = base_img[:, :, 2].astype(int)
    
    green_mask = (g > r + 15) & (g > b + 15)
    y_indices, x_indices = np.where(green_mask)
    
    if len(x_indices) > 0:
        x_min, x_max = np.min(x_indices), np.max(x_indices)
        y_min, y_max = np.min(y_indices), np.max(y_indices)
        x_center = int((x_min + x_max) / 2)
        y_center = int((y_min + y_max) / 2)
    else:
        # Default fallback to center of the image if no green detected
        x_center, y_center = 1280, 720
        
    print(f"Detected oasis center: ({x_center}, {y_center})")
    
    duration = 4.692  # Matches exactly Image 32 B-roll slot duration in Block 7
    total_frames = int(duration * 60) # 281 frames
    
    # Define qanat line starting from mountains (top-left) to the oasis (bottom-right center)
    p0 = np.array([400, 300])
    p1 = np.array([x_center, y_center])
    
    # Define well target positions along the qanat line
    well_positions = [
        p0 + 0.25 * (p1 - p0),
        p0 + 0.50 * (p1 - p0),
        p0 + 0.75 * (p1 - p0)
    ]
    
    print(f"Rendering {total_frames} infographic frames...")
    
    for t in range(total_frames):
        # Create a copy of the high-res image
        frame = base_img.copy()
        
        # --- A. DRAW SATELLITE HUD OVERLAYS ---
        
        # 1. Subterranean qanat channel (Flowing Blue line)
        # BGR blue: (255, 180, 60)
        cv2.line(frame, tuple(p0.astype(int)), tuple(p1.astype(int)), (255, 180, 60), 6)
        
        # Moving water particles dots
        # Fast animation: dot offset changes with time t
        for offset in range(0, 100, 25):
            u = ((t * 1.5 + offset) % 100) / 100.0
            dot_pos = p0 + u * (p1 - p0)
            cv2.circle(frame, tuple(dot_pos.astype(int)), 10, (255, 255, 255), -1)
            # Add a subtle outer glow to water dot
            cv2.circle(frame, tuple(dot_pos.astype(int)), 16, (255, 220, 100), 2)
            
        # 2. Pulsing targets for vertical wells
        for idx, pos in enumerate(well_positions):
            p_int = pos.astype(int)
            # Draw well dot (orange-gold)
            cv2.circle(frame, tuple(p_int), 12, (0, 140, 255), -1)
            
            # Pulse ring
            pulse_r = 20 + int(18 * abs(math.sin(t * 0.08 + idx)))
            # Translucent pulse ring using overlay alpha blend
            overlay = frame.copy()
            cv2.circle(overlay, tuple(p_int), pulse_r, (0, 140, 255), 4)
            # Crosshairs
            cv2.line(overlay, (p_int[0] - pulse_r - 5, p_int[1]), (p_int[0] + pulse_r + 5, p_int[1]), (0, 140, 255), 2)
            cv2.line(overlay, (p_int[0], p_int[1] - pulse_r - 5), (p_int[0], p_int[1] + pulse_r + 5), (0, 140, 255), 2)
            cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
            
            # Label box: "POÇO VERTICAL 1, 2, 3"
            cv2.putText(frame, f"POCO DE ACESSO {idx+1}", (p_int[0] + 30, p_int[1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA)
            # Thin leader line
            cv2.line(frame, (p_int[0], p_int[1]), (p_int[0] + 25, p_int[1] - 10), (255, 255, 255), 2)
            
        # 3. Oasis Scanner (Rotating Green/Cyan HUD)
        oasis_center = p1.astype(int)
        cv2.circle(frame, tuple(oasis_center), 8, (100, 255, 100), -1)
        
        # Rotating outer grid rings
        r1 = 160 + int(10 * math.sin(t * 0.05))
        overlay = frame.copy()
        # Glowing dashed scanner ring
        cv2.circle(overlay, tuple(oasis_center), r1, (120, 255, 120), 3)
        # Draw rotating angle lines
        angle = t * 0.02
        for i in range(4):
            cur_angle = angle + i * (math.pi / 2)
            dx = int(r1 * math.cos(cur_angle))
            dy = int(r1 * math.sin(cur_angle))
            cv2.line(overlay, tuple(oasis_center), (oasis_center[0] + dx, oasis_center[1] + dy), (120, 255, 120), 2)
            
        # Add labels
        cv2.putText(overlay, "OASIS / REGIAO IRRIGADA", (oasis_center[0] - 220, oasis_center[1] + r1 + 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (100, 255, 100), 3, cv2.LINE_AA)
        
        cv2.addWeighted(overlay, 0.5, frame, 0.5, 0, frame)
        
        # 4. Global HUD Info Box (Top right tech panel)
        hud_panel = frame.copy()
        cv2.rectangle(hud_panel, (1800, 50), (2500, 250), (0, 0, 0), -1)
        cv2.rectangle(hud_panel, (1800, 50), (2500, 250), (0, 180, 255), 3)
        cv2.putText(hud_panel, "SYS: ANALISE HIDRICA", (1820, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 200, 255), 2, cv2.LINE_AA)
        cv2.putText(hud_panel, "MODULO: ATIVO", (1820, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.putText(hud_panel, "FLUXO: GRAVIDADE ATIVA", (1820, 185), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.putText(hud_panel, "REDE: DETECTADA (3 POCOS)", (1820, 230), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2, cv2.LINE_AA)
        cv2.addWeighted(hud_panel, 0.6, frame, 0.4, 0, frame)
        
        # --- B. APPLY SMOOTH CROP & ZOOM (Ken Burns effect) ---
        zoom = 1.0 + 0.1 * (t / total_frames)  # zooms in from 1.0 to 1.1
        w_c = int(2560 / zoom)
        h_c = int(1440 / zoom)
        x_start = int((2560 - w_c) / 2)
        y_start = int((1440 - h_c) / 2)
        
        cropped = frame[y_start:y_start+h_c, x_start:x_start+w_c]
        resized = cv2.resize(cropped, (1920, 1080), interpolation=cv2.INTER_LANCZOS4)
        
        # Write to file
        frame_path = os.path.join(output_dir, f"frame_{t:03d}.png")
        cv2.imwrite(frame_path, resized)
        
    print("All frames rendered as PNGs. Compiling to MP4 using FFmpeg...")
    
    # FFmpeg compile command
    cmd = [
        'ffmpeg', '-y', '-i', f"{output_dir}/frame_%03d.png",
        '-vf', 'fps=60',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-r', '60',
        clip_output
    ]
    subprocess.run(cmd, check=True)
    print(f"Infographic video clip successfully compiled: {clip_output}")
    
    # Cleanup PNG frames
    print("Cleaning up PNG frames...")
    import shutil
    shutil.rmtree(output_dir)
    print("Highlight clip pipeline complete!")

if __name__ == '__main__':
    main()
