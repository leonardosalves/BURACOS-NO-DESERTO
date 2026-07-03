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
  /** Preenche o container pai (útil com tamanho em cqw no preview) */
  fill?: boolean;
};

export function OverlayAnimatedIcon({
  iconId,
  iconStyle = 'lottie',
  size = 22,
  color = '#D4AF37',
  className = '',
  fill = false,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLSpanElement>(null);
  const [failed, setFailed] = useState(false);
  const [fillPx, setFillPx] = useState(size);

  useEffect(() => {
    if (!fill) return undefined;
    const el = boxRef.current;
    if (!el) return undefined;
    const sync = () => setFillPx(Math.max(8, Math.round(el.getBoundingClientRect().width)));
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fill]);

  const resolvedSize = fill ? fillPx : size;

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
  }, [iconId, iconStyle, fill ? resolvedSize : size]);

  if (!iconId) return null;

  const boxClass = `inline-flex shrink-0 items-center justify-center ${fill ? 'w-full h-full' : ''} ${className}`.trim();

  if (iconStyle === 'svg' || failed) {
    return (
      <span ref={boxRef} className={boxClass}>
        <OverlaySvgIcon id={iconId} size={resolvedSize} color={color} className={fill ? 'w-full h-full' : undefined} />
      </span>
    );
  }

  return (
    <span ref={boxRef} className={boxClass} style={fill ? undefined : { width: size, height: size }}>
      <div
        ref={hostRef}
        className="w-full h-full"
        style={fill ? undefined : { width: size, height: size }}
      />
    </span>
  );
}