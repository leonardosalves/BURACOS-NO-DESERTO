build_path = r"c:\Users\Leo\Documents\VIDEOS PROFISSIONAIS\LONGOS\BURACOS NO DESERTO\build_video.py"
lines = open(build_path, "r", encoding="utf-8").readlines()
for idx in range(199, min(245, len(lines))):
    print(f"{idx+1}: {lines[idx]}", end="")
