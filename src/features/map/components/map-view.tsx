"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { MapPinned, ShieldCheck, Users } from "lucide-react";
import { MapFilters } from "@/features/map/components/map-filters";
import { WorldMap } from "@/features/map/components/world-map";
import type { MapFilters as MapFiltersState, MapPerson } from "@/features/map/queries/get-map-people";

// Each array-valued filter is a plural key client-side (matches the
// multi-select UI) but is sent as a repeated singular query param, since
// that's what the API route reads via searchParams.getAll(...).
const ARRAY_FILTER_PARAM_NAMES: Record<string, string> = {
  universityIds: "universityId",
  cityIds: "cityId",
  countryIds: "countryId",
  degreeLevels: "degreeLevel",
};

function hasActiveFilters(filters: MapFiltersState) {
  return Object.values(filters).some((value) => (Array.isArray(value) ? value.length > 0 : Boolean(value)));
}

async function fetchPeople(filters: MapFiltersState): Promise<MapPerson[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      const paramName = ARRAY_FILTER_PARAM_NAMES[key] ?? key;
      value.forEach((v) => params.append(paramName, v));
    } else if (value) {
      params.set(key, value as string);
    }
  });
  const res = await fetch(`/api/map/people?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load map data");
  return res.json();
}

async function fetchFilterOptions() {
  const res = await fetch("/api/map/filter-options");
  if (!res.ok) throw new Error("Failed to load filter options");
  return res.json() as Promise<{
    countries: { id: string; name: string }[];
    cities: { id: string; name: string; countryId: string }[];
    universities: { id: string; name: string; cityId: string; lat: number; lng: number }[];
  }>;
}

export function MapView() {
  const [filters, setFilters] = useState<MapFiltersState>({});

  const optionsQuery = useQuery({ queryKey: ["map-filter-options"], queryFn: fetchFilterOptions });
  const peopleQuery = useQuery({
    queryKey: ["map-people", filters],
    queryFn: () => fetchPeople(filters),
    placeholderData: keepPreviousData,
  });

  // Pan/zoom to frame whatever the active filters currently show. With no
  // filters active, focusPoints is empty and WorldMap resets to the default
  // world view.
  const filtersActive = hasActiveFilters(filters);
  const focusPoints = useMemo(() => {
    if (!filtersActive) return [];
    return (peopleQuery.data ?? []).map((person) => ({ lat: person.lat, lng: person.lng }));
  }, [filtersActive, peopleQuery.data]);

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-7 sm:px-8 sm:py-10">
      <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-2xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <span className="size-2 rounded-full bg-foreground" />
            Global directory
          </div>
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-5xl">
            Panin Kashir community, mapped.
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground">
            Browse verified Kashir mentors by university, field, and city.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-5 rounded-2xl border border-border/80 bg-card/70 px-4 py-3 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <span className="text-sm font-semibold">{peopleQuery.data?.length ?? 0}</span>
            <span className="text-sm text-muted-foreground">members mapped</span>
          </div>
          <div className="h-7 w-px bg-border" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Verified profiles
          </div>
        </div>
      </section>

      <section className="grid min-h-[min(680px,calc(100vh-18rem))] overflow-hidden rounded-3xl border border-border/80 bg-card/75 shadow-[0_20px_60px_-30px_oklch(0_0_0_/_0.35)] backdrop-blur-sm lg:grid-cols-[18rem_minmax(0,1fr)]">
        <MapFilters
          filters={filters}
          options={optionsQuery.data ?? { countries: [], cities: [], universities: [] }}
          onChange={setFilters}
        />
        <div className="relative min-h-[480px] bg-muted">
          <div className="pointer-events-none absolute left-4 top-4 z-10 hidden items-center gap-2 rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur md:flex">
            <MapPinned className="size-3.5 text-primary" />
            Explore the diaspora
          </div>
          {peopleQuery.isLoading && (
            <p className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-lg">
              Loading community...
            </p>
          )}
          <WorldMap people={peopleQuery.data ?? []} focusPoints={focusPoints} />
        </div>
      </section>
    </main>
  );
}
