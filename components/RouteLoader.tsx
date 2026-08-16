"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LetsMeetLogo from "@/components/LetsMeetLogo";

const TAB_PATHS = ["/home", "/messages", "/matches", "/notifications", "/account"];

export default function RouteLoader() {
  const pathname = usePathname();
  const [key, setKey] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isTabSwitch = TAB_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
    // Keep tab switches snappy — only show branded loader on deeper routes.
    if (isTabSwitch) {
      setVisible(false);
      return;
    }

    setKey((k) => k + 1);
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 700);
    return () => clearTimeout(t);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      key={key}
      className="fixed inset-0 bg-white/92 backdrop-blur-sm flex flex-col items-center justify-center z-[9999] overflow-hidden animate-fade-up"
      style={{ maxWidth: 600, margin: "0 auto", left: 0, right: 0 }}
    >
      <LetsMeetLogo size={64} priority className="mb-3" />
      <div className="text-primary font-bold tracking-widest text-xl">LETSMEET</div>
    </div>
  );
}
