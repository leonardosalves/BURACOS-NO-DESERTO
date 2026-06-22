import re

with open('mix_bgm.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_fade_in = "fade_in_curve = np.linspace(0.0, 1.0, fade_in_len)[:, np.newaxis]"
new_fade_in = "fade_in_curve = (np.sin(np.linspace(-np.pi/2, np.pi/2, fade_in_len)) + 1) / 2\n            fade_in_curve = fade_in_curve[:, np.newaxis]"

content = content.replace(old_fade_in, new_fade_in)

old_fade_out = "fade_out_curve = np.linspace(1.0, 0.0, fade_out_len)[:, np.newaxis]"
new_fade_out = "fade_out_curve = (np.cos(np.linspace(0, np.pi, fade_out_len)) + 1) / 2\n                fade_out_curve = fade_out_curve[:, np.newaxis]"

content = content.replace(old_fade_out, new_fade_out)

with open('mix_bgm.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("mix_bgm.py updated with sine-based crescendo/diminuendo fades!")
