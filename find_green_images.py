import os
import glob
from PIL import Image
import numpy as np

def main():
    images = glob.glob('ASSETS/images/*.jpeg')
    results = []
    
    for p in images:
        try:
            img = Image.open(p)
            arr = np.array(img)
            # Find dominant green pixels: Green is higher than Red and Blue by at least 15
            # This represents vegetation/fields
            g = arr[:, :, 1].astype(int)
            r = arr[:, :, 0].astype(int)
            b = arr[:, :, 2].astype(int)
            
            green_mask = (g > r + 15) & (g > b + 15)
            green_pct = np.mean(green_mask)
            results.append((p, green_pct))
        except Exception as e:
            print(f"Error processing {p}: {e}")
            
    results = sorted(results, key=lambda x: x[1], reverse=True)
    
    print("Top 10 greenest images in ASSETS/images:")
    for p, pct in results[:10]:
        print(f"{p}: {pct:.2%}")

if __name__ == '__main__':
    main()
