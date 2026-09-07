"use client";

import { ChevronDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function MultiSelectField({
  placeholder = "Any",
  options,
  selectedIds,
  onChange,
  emptyMessage = "No options yet.",
}: {
  placeholder?: string;
  options: { id: string; label: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyMessage?: string;
}) {
  const hasSelection = selectedIds.length > 0;
  const triggerLabel =
    selectedIds.length === 0
      ? placeholder
      : selectedIds.length === 1
        ? (options.find((option) => option.id === selectedIds[0])?.label ?? "1 selected")
        : `${selectedIds.length} selected`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border py-2 pr-2 pl-2.5 text-sm whitespace-nowrap outline-none select-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
              hasSelection
                ? "border-primary/40 bg-primary/[0.06] font-medium text-foreground focus-visible:border-ring"
                : "border-input bg-transparent text-muted-foreground focus-visible:border-ring",
            )}
          />
        }
      >
        <span className="line-clamp-1 flex-1 text-left">{triggerLabel}</span>
        {hasSelection && (
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            {selectedIds.length}
          </span>
        )}
        <ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-72">
        {options.length === 0 && <p className="px-1.5 py-1 text-xs text-muted-foreground">{emptyMessage}</p>}
        {options.map((option) => {
          const checked = selectedIds.includes(option.id);
          return (
            <DropdownMenuCheckboxItem
              key={option.id}
              checked={checked}
              onCheckedChange={(next) => {
                onChange(next ? [...selectedIds, option.id] : selectedIds.filter((id) => id !== option.id));
              }}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
