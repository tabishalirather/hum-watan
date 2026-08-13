"use client";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { MapFilters as MapFiltersState } from "@/features/map/queries/get-map-people";

type FilterOptions = {
  countries: { id: string; name: string }[];
  cities: { id: string; name: string; countryId: string }[];
  universities: { id: string; name: string; cityId: string }[];
};

const DEGREE_LEVELS = ["bachelors", "masters", "phd", "other"] as const;

export function MapFilters({
  filters,
  options,
  onChange,
}: {
  filters: MapFiltersState;
  options: FilterOptions;
  onChange: (filters: MapFiltersState) => void;
}) {
  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r p-4">
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          placeholder="e.g. Mathematics"
          value={filters.subject ?? ""}
          onChange={(e) => onChange({ ...filters, subject: e.target.value || undefined })}
        />
      </div>

      <div className="space-y-2">
        <Label>Degree level</Label>
        <Select
          value={filters.degreeLevel ?? "any"}
          onValueChange={(value) =>
            onChange({
              ...filters,
              degreeLevel: value === "any" ? undefined : (value as MapFiltersState["degreeLevel"]),
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            {DEGREE_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Country</Label>
        <Select
          value={filters.countryId ?? "any"}
          onValueChange={(value) =>
            onChange({ ...filters, countryId: !value || value === "any" ? undefined : value })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            {options.countries.map((country) => (
              <SelectItem key={country.id} value={country.id}>
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>City</Label>
        <Select
          value={filters.cityId ?? "any"}
          onValueChange={(value) =>
            onChange({ ...filters, cityId: !value || value === "any" ? undefined : value })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            {options.cities
              .filter((city) => !filters.countryId || city.countryId === filters.countryId)
              .map((city) => (
                <SelectItem key={city.id} value={city.id}>
                  {city.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>University</Label>
        <Select
          value={filters.universityId ?? "any"}
          onValueChange={(value) =>
            onChange({ ...filters, universityId: !value || value === "any" ? undefined : value })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            {options.universities.map((university) => (
              <SelectItem key={university.id} value={university.id}>
                {university.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </aside>
  );
}
