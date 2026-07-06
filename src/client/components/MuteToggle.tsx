import { Volume2, VolumeX } from "lucide-react";

interface MuteToggleProps {
  muted: boolean;
  onChange: (muted: boolean) => void;
}

export function MuteToggle({ muted, onChange }: MuteToggleProps) {
  return (
    <button
      className="icon-button"
      type="button"
      aria-pressed={muted}
      aria-label={muted ? "Unmute tracker sounds" : "Mute tracker sounds"}
      onClick={() => onChange(!muted)}
    >
      {muted ? <VolumeX /> : <Volume2 />}
    </button>
  );
}
