import filecmp

f1 = r"c:\Users\Leo\Documents\VIDEOS PROFISSIONAIS\LONGOS\BURACOS NO DESERTO\align_transcripts.py"
f2 = r"c:\Users\Leo\Documents\VIDEOS PROFISSIONAIS\LONGOS\BURACOS NO DESERTO\escadas_castelos_giram\align_transcripts.py"

try:
    match = filecmp.cmp(f1, f2, shallow=False)
    print(f"Are align_transcripts.py files identical? {match}")
except Exception as e:
    print(e)
