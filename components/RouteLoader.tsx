"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LetsMeetLogo from "@/components/LetsMeetLogo";

const hearts = [
  { left: "10%", delay: "0.5s" },
  { left: "30%", delay: "2.5s" },
  { left: "55%", delay: "1.5s" },
  { left: "75%", delay: "1s" },
];

export default function RouteLoader() {
  const pathname = usePathname();
  const [key, setKey] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setKey((k) => k + 1);
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1400);
    return () => clearTimeout(t);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      key={key}
      className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[9999] overflow-hidden"
      style={{ maxWidth: 600, margin: "0 auto", left: 0, right: 0 }}
    >
      {/* Floating heart particles */}
      {hearts.map((h, i) => (
        <span
          key={i}
          className="absolute text-primary text-2xl"
          style={{
            left: h.left,
            bottom: 0,
            opacity: 0,
            animation: `floatHeart 5s linear ${h.delay} infinite`,
          }}
        >
          ♥
        </span>
      ))}

      <LetsMeetLogo size={80} priority className="mb-4" />

      {/* LETSMEET text */}
      <div className="text-primary font-bold tracking-widest" style={{ fontSize: "2rem", lineHeight: 1 }}>
        LETSMEET
      </div>
    </div>
  );
}
