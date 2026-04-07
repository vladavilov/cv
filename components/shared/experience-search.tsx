import { Search } from "lucide-react";

type ExperienceSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isStreaming: boolean;
};

export function ExperienceSearch({
  value,
  onChange,
  onSubmit,
  isStreaming,
}: ExperienceSearchProps) {
  return (
    <form
      className="flex items-center gap-3 rounded-xl border border-[#30302e] bg-[#30302e] px-4 py-3 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
      onSubmit={(event) => {
        event.preventDefault();
        if (isStreaming) {
          return;
        }
        onSubmit();
      }}
    >
      <Search aria-hidden="true" className="size-5 shrink-0 text-[#87867f]" />
      <label className="sr-only" htmlFor="experience-query">
        Search my experience
      </label>
      <input
        id="experience-query"
        name="experience-query"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        placeholder="Ask about agentic systems, fine-tuning, RAG…"
        className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground placeholder:text-[#5e5d59] focus:outline-none"
      />
      <button
        type="submit"
        disabled={isStreaming}
        className="shrink-0 rounded-lg bg-[#c96442] px-4 py-2 text-sm font-medium text-[#faf9f5] transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 hover:bg-[#d97757] disabled:opacity-50"
      >
        {isStreaming ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
