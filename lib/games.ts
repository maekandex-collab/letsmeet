export type GameSlug = "stack-tower" | "color-dash" | "heart-catcher" | "memory-match";

export interface GameMeta {
  slug: GameSlug;
  title: string;
  tagline: string;
  description: string;
  howTo: string;
  difficulty: "Easy" | "Medium" | "Hard";
  emoji: string;
  accent: string;
  src: string;
  highScoreKey: string;
}

export const GAMES: GameMeta[] = [
  {
    slug: "stack-tower",
    title: "Stack Tower",
    tagline: "5-second drops",
    description: "Drop each moving block before time runs out. Perfect alignments stack bonus points.",
    howTo: "Tap or press space to drop. Align the moving block with the tower.",
    difficulty: "Medium",
    emoji: "⚡",
    accent: "from-[#F759F5] to-[#3E36ED]",
    src: "/games/stack-tower.html",
    highScoreKey: "stackTower5sHigh",
  },
  {
    slug: "color-dash",
    title: "Color Dash",
    tagline: "Match the gaps",
    description: "Steer through matching color gaps. Miss the hue and the run is over.",
    howTo: "Drag left and right. Tap or press space to cycle colors.",
    difficulty: "Hard",
    emoji: "🌈",
    accent: "from-[#3E36ED] to-[#F759F5]",
    src: "/games/color-dash.html",
    highScoreKey: "colorDashFluidHigh",
  },
  {
    slug: "heart-catcher",
    title: "Heart Catcher",
    tagline: "One miss ends it",
    description: "Catch falling hearts and dodge bombs. A single miss ends the round.",
    howTo: "Drag the catcher. Hearts score. Bombs and missed hearts end the game.",
    difficulty: "Easy",
    emoji: "💖",
    accent: "from-[#F759F5] to-[#fb7185]",
    src: "/games/heart-catcher.html",
    highScoreKey: "heartCatcherOneMissHigh",
  },
  {
    slug: "memory-match",
    title: "Memory Match",
    tagline: "10-second resets",
    description: "Flip pairs before the clock hits zero. Each match buys you another 10 seconds.",
    howTo: "Tap two cards. Match all 8 pairs to win.",
    difficulty: "Easy",
    emoji: "🧠",
    accent: "from-[#3E36ED] to-[#818cf8]",
    src: "/games/memory-match.html",
    highScoreKey: "memory10sHigh",
  },
];

export function getGame(slug: string): GameMeta | undefined {
  return GAMES.find((game) => game.slug === slug);
}
