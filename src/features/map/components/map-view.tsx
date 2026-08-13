"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapFilters } from "@/features/map/components/map-filters";
import { WorldMap } from "@/features/map/components/world-map";
import type { MapFilters as MapFiltersState, MapPerson } from "@/features/map/queries/get-map-people";

async function fetchPeople(filters: MapFiltersState): Promise<MapPerson[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
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
    universities: { id: string; name: string; cityId: string }[];
  }>;
}

export function MapView() {
  const [filters, setFilters] = useState<MapFiltersState>({});

  const optionsQuery = useQuery({ queryKey: ["map-filter-options"], queryFn: fetchFilterOptions });
  const peopleQuery = useQuery({
    queryKey: ["map-people", filters],
    queryFn: () => fetchPeople(filters),
  });

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <MapFilters
        filters={filters}
        options={optionsQuery.data ?? { countries: [], cities: [], universities: [] }}
        onChange={setFilters}
      />
      <div className="relative flex-1">
        {peopleQuery.isLoading && (
          <p className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded bg-background px-3 py-1 text-sm shadow">
            Loading...
          </p>
        )}
        <WorldMap people={peopleQuery.data ?? []} />
      </div>
    </div>
  );
}
