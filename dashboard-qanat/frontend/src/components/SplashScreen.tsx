import { useCallback, useEffect, useState } from "react";
import AnimatedLogo from "./AnimatedLogo";

type SplashScreenProps = {
  onDone?: () => void;
  minDuration?: number;
};

/**
 * Abertura cinematográfica do Lumiera (~2.6s).
 * Clique para pular. Chama onDone ao terminar.
 */
export default function SplashScreen({
  onDone,
  minDuration = 2600,
}: SplashScreenProps) {
  const [leaving, setLeaving] = useState(false);

  const finish = useCallback(() => {
    setLeaving(true);
    window.setTimeout(() => onDone?.(), 550);
  }, [onDone]);

  useEffect(() => {
    const t = window.setTimeout(finish, minDuration);
    return () => window.clearTimeout(t);
  }, [minDuration, finish]);

  return (
    <div
      className={`splash ${leaving ? "splash--leaving" : ""}`}
      onClick={finish}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") finish();
      }}
      role="presentation"
    >
      <AnimatedLogo size={132} />
      <div className="splash-wordmark">Lumiera</div>
      <div className="splash-tagline">VIDEO STUDIO</div>
      <div className="splash-progress">
        <span className="splash-progress__fill" />
      </div>
      <div className="splash-hint mono">clique para pular</div>
    </div>
  );
}
