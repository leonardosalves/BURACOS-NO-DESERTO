import React, { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';
import type { OverlayIconStyle } from './overlayIconCatalog';
import { loadOverlayLottie } from './overlayLottieLoaders';
import { OverlaySvgIcon } from './overlaySvgIcons';

type Props = {
  iconId?: string;
  iconStyle?: OverlayIconStyle;
  size?: number;
  color?: string;
  className?: string;
};

export function OverlayAnimatedIcon({
  iconId,
  iconStyle = 'lottie',
  size = 22,
  color = '#D4AF37',
  className = '',
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!iconId || iconStyle !== 'lottie' || !hostRef.current) return undefined;
    let anim: ReturnType<typeof lottie.loadAnimation> | null = null;
    let cancelled = false;
    setFailed(false);

    loadOverlayLottie(iconId).then((data) => {
      if (cancelled || !hostRef.current) return;
      if (!data) {
        setFailed(true);
        return;
      }
      anim = lottie.loadAnimation({
        container: hostRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: data,
      });
    }).catch(() => setFailed(true));

    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, [iconId, iconStyle]);

  if (!iconId) return null;

  if (iconStyle === 'svg' || failed) {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center ${className}`.trim()}>
        <OverlaySvgIcon id={iconId} size={size} color={color} />
      </span>
    );
  }

  return (
    <div
      ref={hostRef}
      className={`inline-flex shrink-0 items-center justify-center ${className}`.trim()}
      style={{ width: size, height: size }}
    />
  );
}