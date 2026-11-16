import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const assets = import.meta.glob<{ url: string }>("../../assets/logos/*.asset.json", {
  eager: true,
  import: "default",
});
const logos = Object.entries(assets).sort(([a], [b]) => a.localeCompare(b)).map(([, asset]) => asset.url);
const LogoContext = createContext(logos[0]);

export const LogoProvider = ({ children }: { children: ReactNode }) => {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * logos.length));
  const url = logos[index];

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((previous) => (previous + 1) % logos.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon) icon.href = url;
  }, [url]);

  return <LogoContext.Provider value={url}>{children}</LogoContext.Provider>;
};

export const useLogo = () => useContext(LogoContext);