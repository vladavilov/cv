type PromptChip = {
  label: string;
  query: string;
};

type PromptChipsProps = {
  chips: PromptChip[];
  onSelect: (query: string) => void;
  disabled?: boolean;
};

export function PromptChips({ chips, onSelect, disabled = false }: PromptChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          disabled={disabled}
          className="rounded-lg border border-[#30302e] bg-[#30302e] px-3 py-1.5 text-sm text-[#b0aea5] transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 hover:bg-[#3d3d3a] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onSelect(chip.query)}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
