import React, { useEffect, useRef, useState } from "react";
import { useCurrentFrame, useDelayRender } from "remotion";
import lottie, { AnimationItem } from "lottie-web";

interface SafeLottieProps {
  animationData: any;
  style?: React.CSSProperties;
  onFailed?: () => void;
}

export const SafeLottie: React.FC<SafeLottieProps> = ({ animationData, style, onFailed }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender("Waiting for Lottie animation to load"));
  const frame = useCurrentFrame();

  useEffect(() => {
    let active = true;
    let timeoutId = setTimeout(() => {
      if (active) {
        console.warn("Lottie loading timed out, continuing render anyway.");
        onFailed?.();
        try {
          continueRender(handle);
        } catch (e) {
          // Ignore if already cleared
        }
      }
    }, 1500); // 1.5 seconds safety timeout

    try {
      if (containerRef.current) {
        const anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: true,
          autoplay: false,
          animationData,
        });
        
        animationRef.current = anim;

        const onComplete = () => {
          clearTimeout(timeoutId);
          if (active) {
            try {
              continueRender(handle);
            } catch (e) {
              // Ignore if already cleared
            }
          }
        };

        anim.addEventListener("DOMLoaded", onComplete);
      } else {
        clearTimeout(timeoutId);
        try {
          continueRender(handle);
        } catch (e) {
          // Ignore
        }
      }
    } catch (err) {
      console.error("Failed to load Lottie animation:", err);
      onFailed?.();
      clearTimeout(timeoutId);
      try {
        continueRender(handle);
      } catch (e) {
        // Ignore
      }
    }

    return () => {
      active = false;
      clearTimeout(timeoutId);
      if (animationRef.current) {
        try {
          animationRef.current.destroy();
        } catch (e) {
          // Ignore destroy errors
        }
      }
      try {
        continueRender(handle);
      } catch (e) {
        // Ignore
      }
    };
  }, [animationData, handle, continueRender, onFailed]);

  // Sync the animation frame with Remotion's frame
  useEffect(() => {
    const anim = animationRef.current;
    if (anim && anim.totalFrames) {
      const targetFrame = Math.floor(frame) % anim.totalFrames;
      anim.goToAndStop(targetFrame, true);
    }
  }, [frame]);

  return <div ref={containerRef} style={style} />;
};
