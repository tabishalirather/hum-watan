"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { MultiSelectField } from "@/shared/components/multi-select-field";
import { ChartCard, Bar } from "@/features/admin/components/admin-dashboard-charts";
import type { MapFilters as MapFiltersState } from "@/features/map/queries/get-map-people";
import type { CountryDistribution } from "@/features/admin/queries/get-country-distribution";

const DEGREE_LEVELS = ["bachelors", "masters", "phd", "other"] as const;

const ARRAY_FILTER_PARAM_NAMES: Record<string, string> = {
  universityIds: "universityId",
  cityIds: "cityId",
  countryIds: "countryId",
  degreeLevels: "degreeLevel",
};

type FilterOptions = {
  countries: { id: string; name: string }[];
  cities: { id: string; name: string; countryId: string }[];
  universities: { id: string; name: string; cityId: string }[];
};

async function fetchFilterOptions() {
  const res = await fetch("/api/map/filter-options");
  if (!res.ok) throw new Error("Failed to load filter options");
  return res.json() as Promise<FilterOptions>;
}

async function fetchCountryDistribution(filters: MapFiltersState): Promise<CountryDistribution> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      const paramName = ARRAY_FILTER_PARAM_NAMES[key] ?? key;
      value.forEach((v) => params.append(paramName, v));
    } else if (value) {
      params.set(key, value as string);
    }
  });
  const res = await fetch(`/api/admin/country-distribution?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load country distribution");
  return res.json();
}

const COUNTRY_COLORS = [
  "#0f766e", "#2563eb", "#7c3aed", "#059669", "#d97706",
  "#e11d48", "#0891b2", "#4f46e5", "#16a34a", "#ea580c",
];

export function CountryDistributionChart() {
  const [filters, setFilters] = useState<MapFiltersState>({});

  const optionsQuery = useQuery({
    queryKey: ["admin-filter-options"],
    queryFn: fetchFilterOptions,
  });

  const distributionQuery = useQuery({
    queryKey: ["admin-country-distribution", filters],
    queryFn: () => fetchCountryDistribution(filters),
    placeholderData: keepPreviousData,
  });

  const options = optionsQuery.data ?? { countries: [], cities: [], universities: [] };
  const distribution = distributionQuery.data ?? [];
  const total = distribution.reduce((sum, row) => sum + (row.count as number), 0);

  // Show top 10 countries, collapse the rest into "Other countries"
  const TOP_N = 10;
  const topCountries = distribution.slice(0, TOP_N);
  const otherCountries = distribution.slice(TOP_N);
  const otherCount = otherCountries.reduce((sum, row) => sum + (row.count as number), 0);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-card/60 p-4">
        <div className="flex-1 min-w-48">
          <Label className="mb-2 block text-xs font-medium text-muted-foreground">Subject</Label>
          <Input
            placeholder="e.g. Mathematics"
            value={filters.subject ?? ""}
            onChange={(e) => setFilters({ ...filters, subject: e.target.value || undefined })}
          />
        </div>

        <div className="flex-1 min-w-40">
          <Label className="mb-2 block text-xs font-medium text-muted-foreground">Degree level</Label>
          <MultiSelectField
            options={DEGREE_LEVELS.map((level) => ({ id: level, label: level }))}
            selectedIds={filters.degreeLevels ?? []}
            onChange={(degreeLevels) =>
              setFilters({
                ...filters,
                degreeLevels:
                  degreeLevels.length > 0 ? (degreeLevels as MapFiltersState["degreeLevels"]) : undefined,
              })
            }
          />
        </div>

        <div className="flex-1 min-w-40">
          <Label className="mb-2 block text-xs font-medium text-muted-foreground">Country</Label>
          <MultiSelectField
            options={options.countries.map((country) => ({ id: country.id, label: country.name }))}
            selectedIds={filters.countryIds ?? []}
            onChange={(countryIds) =>
              setFilters({ ...filters, countryIds: countryIds.length > 0 ? countryIds : undefined })
            }
          />
        </div>

        <div className="flex-1 min-w-40">
          <Label className="mb-2 block text-xs font-medium text-muted-foreground">City</Label>
          <MultiSelectField
            options={options.cities
              .filter((city) => !filters.countryIds?.length || filters.countryIds.includes(city.countryId))
              .map((city) => ({ id: city.id, label: city.name }))}
            selectedIds={filters.cityIds ?? []}
            onChange={(cityIds) => setFilters({ ...filters, cityIds: cityIds.length > 0 ? cityIds : undefined })}
          />
        </div>

        <div className="flex-1 min-w-40">
          <Label className="mb-2 block text-xs font-medium text-muted-foreground">University</Label>
          <MultiSelectField
            options={options.universities.map((university) => ({ id: university.id, label: university.name }))}
            selectedIds={filters.universityIds ?? []}
            onChange={(universityIds) =>
              setFilters({ ...filters, universityIds: universityIds.length > 0 ? universityIds : undefined })
            }
            emptyMessage="No universities yet."
          />
        </div>
      </div>

      {/* Chart */}
      <ChartCard title="Mentor distribution by country" subtitle={`${total} verified mentors across ${distribution.length} countries`}>
        {distributionQuery.isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">Loading distribution...</div>
        ) : distribution.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">No mentors match these filters yet.</div>
        ) : (
          <div className="space-y-3">
            {topCountries.map((row, index) => (
              <Bar
                key={row.countryId}
                label={row.countryName}
                value={row.count as number}
                total={total}
                color={COUNTRY_COLORS[index % COUNTRY_COLORS.length]}
              />
            ))}
            {otherCountries.length > 0 && (
              <div className="border-t border-border/50 pt-3">
                <Bar
                  label={`${otherCountries.length} other countries`}
                  value={otherCount}
                  total={total}
                  color="#999999"
                />
              </div>
            )}
          </div>
        )}
      </ChartCard>
    </div>
  );
}
