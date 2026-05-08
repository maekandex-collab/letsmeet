import Link from "next/link";
import { BackHeader } from "@/components/Header";

const matches = [
  { name: "Sophiya Calzoni", age: 24, city: "Florida", bg: "#E8D5F5" },
  { name: "Isabella Uzo", age: 22, city: "Texas", bg: "#D5E8F5" },
  { name: "Elizabeth Maria", age: 28, city: "California", bg: "#F5E8D5" },
  { name: "Tina Schaefer", age: 25, city: "New York", bg: "#D5F5E8" },
  { name: "Maria Panola", age: 22, city: "Florida", bg: "#F5D5E8" },
  { name: "Janet Wilson", age: 27, city: "Texas", bg: "#E8D5D5" },
  { name: "Ana Oliveira", age: 23, city: "Miami", bg: "#D5D5E8" },
  { name: "Chen Wei", age: 26, city: "Boston", bg: "#E8F5D5" },
];

export default function AllMatchesPage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader title="All Matches" />
      <div className="flex-1 overflow-y-auto pt-20 pb-6">
        <div className="px-5 pt-4 grid grid-cols-2 gap-3">
          {matches.map((m) => (
            <Link key={m.name} href="/profile-single" className="rounded-2xl overflow-hidden shadow-card bg-white border border-border">
              <div className="aspect-[4/5] flex items-end" style={{ backgroundColor: m.bg }}>
                <div className="w-full p-3 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-white font-bold text-sm truncate">{m.name}</p>
                  <p className="text-white/80 text-xs">{m.age} yr • {m.city}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
