import { AudioLines, Heart, User, Users } from "lucide-react";
import type { AppRoute } from "../routes";

interface BottomNavProps {
  current: AppRoute;
  onNavigate: (viewer: AppRoute) => void;
}

export function BottomNav({ current, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Tracker navigation">
      <NavButton active={current === "doug"} icon={<User />} label="Doug" onClick={() => onNavigate("doug")} />
      <NavButton active={current === "rosie"} icon={<Users />} label="Rosie" onClick={() => onNavigate("rosie")} />
      <NavButton active={current === "couple"} icon={<Heart />} label="Couple" onClick={() => onNavigate("couple")} />
      <NavButton active={current === "sound-lab"} icon={<AudioLines />} label="SFX" onClick={() => onNavigate("sound-lab")} />
    </nav>
  );
}

interface NavButtonProps {
  active: boolean;
  icon: React.ReactElement;
  label: string;
  onClick: () => void;
}

function NavButton({ active, icon, label, onClick }: NavButtonProps) {
  return (
    <button className={active ? "nav-button active" : "nav-button"} type="button" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
