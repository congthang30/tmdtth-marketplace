import { ChevronDown } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export type ComboboxOption = {
  value: string;
  label: string;
};

type ComboboxProps = {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  onQueryChange: (query: string) => void;
  query: string;
  error?: string;
  disabled?: boolean;
  disabledHint?: string;
  emptyMessage?: string;
  name?: string;
  required?: boolean;
};

/**
 * Accessible searchable combobox (WAI-ARIA combobox pattern) used to pick a
 * single value from a large list by typing to filter, matching the
 * autocomplete-style province/district/ward pickers used by Shopee/Lazada/
 * Tiki. This is a pure UI primitive: it has no knowledge of address data —
 * the option list, query and selection are fully controlled by the caller.
 */
export function Combobox({
  label,
  placeholder,
  value,
  onChange,
  options,
  onQueryChange,
  query,
  error,
  disabled = false,
  disabledHint,
  emptyMessage = "Không tìm thấy kết quả",
  name,
  required,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputId = useId();
  const listboxId = useId();
  const errorId = useId();

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const displayText = isOpen ? query : (selectedOption?.label ?? "");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      const activeItem = listRef.current.children[activeIndex] as
        | HTMLElement
        | undefined;
      activeItem?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, isOpen]);

  const openList = () => {
    if (disabled) {
      return;
    }
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const closeList = () => {
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const selectOption = (option: ComboboxOption) => {
    onChange(option.value);
    onQueryChange("");
    closeList();
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        openList();
        return;
      }
      setActiveIndex((previous) =>
        Math.min(previous + 1, options.length - 1),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openList();
        return;
      }
      setActiveIndex((previous) => Math.max(previous - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (isOpen && activeIndex >= 0 && options[activeIndex]) {
        selectOption(options[activeIndex]);
      }
    } else if (event.key === "Escape") {
      if (isOpen) {
        event.preventDefault();
        closeList();
      }
    } else if (event.key === "Tab") {
      closeList();
    }
  };

  return (
    <div className="block" ref={containerRef}>
      <label className="text-sm font-medium text-ink" htmlFor={inputId}>
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      <div className="relative mt-1">
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          aria-activedescendant={
            isOpen && activeIndex >= 0
              ? `${listboxId}-option-${activeIndex}`
              : undefined
          }
          autoComplete="off"
          disabled={disabled}
          placeholder={
            disabled ? (disabledHint ?? placeholder) : placeholder
          }
          value={displayText}
          onFocus={openList}
          onClick={openList}
          onChange={(event) => {
            onQueryChange(event.target.value);
            if (value) {
              onChange("");
            }
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className={[
            "block w-full min-h-11 rounded-md border border-border bg-white px-3 py-2 pr-9 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100",
            error ? "border-danger focus:border-danger focus:ring-red-100" : "",
            disabled ? "cursor-not-allowed bg-surface text-muted" : "",
          ].join(" ")}
        />
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
        />
        {isOpen && !disabled ? (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-white py-1 shadow-lg"
          >
            {options.length > 0 ? (
              options.map((option, index) => (
                <li
                  key={option.value}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    selectOption(option);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={[
                    "cursor-pointer px-3 py-2 text-sm",
                    index === activeIndex
                      ? "bg-primary-50 text-primary-700"
                      : "text-ink",
                    option.value === value ? "font-semibold" : "",
                  ].join(" ")}
                >
                  {option.label}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-muted" aria-disabled="true">
                {emptyMessage}
              </li>
            )}
          </ul>
        ) : null}
      </div>
      {error ? (
        <span id={errorId} className="mt-1 block text-xs text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}
