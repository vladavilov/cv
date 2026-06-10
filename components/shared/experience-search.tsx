import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
      onSubmit={(event) => {
        event.preventDefault();
        if (isStreaming) {
          return;
        }
        onSubmit();
      }}
    >
      <Search aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
      <label className="sr-only" htmlFor="experience-query">
        Search my experience
      </label>
      <Input
        variant="ghost"
        id="experience-query"
        name="experience-query"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        placeholder="Ask about Vlad's experience, projects, skills, …"
      />
      <Button type="submit" disabled={isStreaming}>
        {isStreaming ? "Searching…" : "Search"}
      </Button>
    </form>
  );
}
