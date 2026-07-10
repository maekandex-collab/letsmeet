import Image from "next/image";

export const LOGO_PATH = "/letsmeet-logo.png";

interface LetsMeetLogoProps {
  /** Logo height/width in pixels (square). */
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  className?: string;
  priority?: boolean;
}

/** LetsMeet brand mark — use everywhere the app logo appears. */
export default function LetsMeetLogo({
  size = 36,
  showWordmark = false,
  wordmarkClassName = "text-xl font-bold text-dark",
  className = "",
  priority = false,
}: LetsMeetLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src={LOGO_PATH}
        alt="LetsMeet"
        width={size}
        height={size}
        className="object-contain shrink-0"
        priority={priority}
      />
      {showWordmark && <span className={wordmarkClassName}>LetsMeet</span>}
    </span>
  );
}
