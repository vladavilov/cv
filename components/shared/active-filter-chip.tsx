import { X } from "lucide-react";

type ActiveFilterChipProps = {
  value: string;
  onClear: () => void;
};

export function ActiveFilterChip({ value, onClear }: ActiveFilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="flex shrink-0 items-center gap-2 rounded-lg border border-[#c96442]/30 bg-[#c96442]/10 px-3 py-1.5 text-sm text-[#d97757] transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 hover:bg-[#c96442]/14"
      aria-label={`Clear filter: ${value}`}
    >
      {value}
      <X aria-hidden="true" className="size-3.5" />
    </button>
  );
}
