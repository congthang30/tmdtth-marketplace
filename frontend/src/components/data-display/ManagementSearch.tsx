import { useAuthStore } from "@/stores/auth.store";
import { SuggestionSearch } from "@/features/search/SuggestionSearch";
import type { SearchScope } from "@/features/search/api";

 type ManagementSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  resultCount?: number;
  scope: SearchScope;
};

export function ManagementSearch({ value, onChange, placeholder, resultCount, scope }: ManagementSearchProps) {
  const roles = useAuthStore((state) => state.user?.roles ?? []);
  const context = roles.includes("Admin") ? "admin" : "seller";

  return (
    <div className="rounded-lg border border-border bg-white p-3 shadow-panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SuggestionSearch
          context={context}
          scope={scope}
          embedded
          value={value}
          onValueChange={onChange}
          onSuggestionSelect={(suggestion) => onChange(suggestion.title)}
          placeholder={placeholder}
          label={placeholder}
        />
        {typeof resultCount === "number" ? <p className="shrink-0 px-1 text-sm text-muted" aria-live="polite">{resultCount} kết quả</p> : null}
      </div>
    </div>
  );
}
