import { useEffect, useState } from "react";

export function StoryLoadingScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const seen = sessionStorage.getItem("cutiuta:story-intro");
    if (seen) {
      setVisible(false);
      return;
    }
    sessionStorage.setItem("cutiuta:story-intro", "1");
    const timer = window.setTimeout(() => setVisible(false), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return (
    <div className="story-loader" role="status" aria-label="Se deschide povestea">
      <div className="story-loader__glow" />
      <div className="story-loader__box">
        <div className="story-loader__lid" />
        <div className="story-loader__key" />
        <span className="story-loader__note story-loader__note--one">♪</span>
        <span className="story-loader__note story-loader__note--two">♫</span>
      </div>
      <p>Se deschide povestea...</p>
    </div>
  );
}
