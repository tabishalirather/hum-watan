"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { ArrowUpRight, ListFilter, Mail, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { MultiSelectField } from "@/shared/components/multi-select-field";
import type { MapFilters as MapFiltersState } from "@/features/map/queries/get-map-people";

type FilterOptions = {
  countries: { id: string; name: string }[];
  cities: { id: string; name: string; countryId: string }[];
  universities: { id: string; name: string; cityId: string }[];
};

const DEGREE_LEVELS = ["bachelors", "masters", "phd", "other"] as const;
const inviteHref = `mailto:?subject=Join%20Hum%20Watan&body=I%20thought%20you%20might%20like%20Hum%20Watan%2C%20a%20verified%20network%20for%20Kashmiri%20students%20and%20diaspora%3A%20${encodeURIComponent(process.env.NEXT_PUBLIC_APP_URL ?? "")}`;

export function MapFilters({
  filters,
  options,
  onChange,
}: {
  filters: MapFiltersState;
  options: FilterOptions;
  onChange: (filters: MapFiltersState) => void;
}) {
  const { status } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const hasFilters = Object.values(filters).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  );

  return (
    <aside className="grid grid-cols-2 gap-x-4 gap-y-4 border-b border-border/80 bg-card/60 p-5 lg:flex lg:flex-col lg:gap-5 lg:border-r lg:border-b-0">
      <div className="col-span-2 flex items-start justify-between gap-3 lg:col-span-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ListFilter className="size-4 text-primary" />
            Refine the map
          </div>
          <p className="text-xs leading-5 text-muted-foreground">Narrow the community by academic context.</p>
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Clear filters"
            title="Clear filters"
            onClick={() => onChange({})}
          >
            <RotateCcw />
          </Button>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="col-span-2 w-full justify-center lg:hidden"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        aria-expanded={isExpanded}
      >
        <SlidersHorizontal />
        {isExpanded ? "Hide filters" : "Show filters"}
      </Button>

      <div className={`${isExpanded ? "grid" : "hidden lg:grid"} col-span-2 grid-cols-2 gap-x-4 gap-y-4 lg:col-span-1 lg:contents`}>
        <div className="col-span-2 space-y-2 lg:col-span-1">
          <Label className="text-xs font-medium text-muted-foreground" htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            placeholder="e.g. Mathematics"
            value={filters.subject ?? ""}
            onChange={(e) => onChange({ ...filters, subject: e.target.value || undefined })}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Degree level</Label>
          <MultiSelectField
            options={DEGREE_LEVELS.map((level) => ({ id: level, label: level }))}
            selectedIds={filters.degreeLevels ?? []}
            onChange={(degreeLevels) =>
              onChange({
                ...filters,
                degreeLevels:
                  degreeLevels.length > 0 ? (degreeLevels as MapFiltersState["degreeLevels"]) : undefined,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Country</Label>
          <MultiSelectField
            options={options.countries.map((country) => ({ id: country.id, label: country.name }))}
            selectedIds={filters.countryIds ?? []}
            onChange={(countryIds) =>
              onChange({ ...filters, countryIds: countryIds.length > 0 ? countryIds : undefined })
            }
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">City</Label>
          <MultiSelectField
            options={options.cities
              .filter((city) => !filters.countryIds?.length || filters.countryIds.includes(city.countryId))
              .map((city) => ({ id: city.id, label: city.name }))}
            selectedIds={filters.cityIds ?? []}
            onChange={(cityIds) => onChange({ ...filters, cityIds: cityIds.length > 0 ? cityIds : undefined })}
          />
        </div>

        <div className="col-span-2 space-y-2 lg:col-span-1">
          <Label className="text-xs font-medium text-muted-foreground">University</Label>
          <MultiSelectField
            options={options.universities.map((university) => ({ id: university.id, label: university.name }))}
            selectedIds={filters.universityIds ?? []}
            onChange={(universityIds) =>
              onChange({ ...filters, universityIds: universityIds.length > 0 ? universityIds : undefined })
            }
            emptyMessage="No universities yet."
          />
        </div>
      </div>

      <div className="col-span-2 mt-auto space-y-2 rounded-2xl border border-border/80 bg-secondary/60 p-4 lg:col-span-1">
        {status === "authenticated" ? (
          <>
            <p className="text-sm font-semibold text-foreground">Know someone who belongs here?</p>
            <p className="text-xs leading-5 text-muted-foreground">
              Invite another Kashmiri student or mentor to join the network.
            </p>
            <Button
              render={
                <a
                  href={inviteHref}
                />
              }
              nativeButton={false}
              size="sm"
              className="w-full justify-center"
            >
              Invite others to join
              <Mail data-icon="inline-end" />
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground">Not on the map yet?</p>
            <p className="text-xs leading-5 text-muted-foreground">
              Verified students and mentors get a pin on the map automatically.
            </p>
            <Button render={<Link href="/register" />} nativeButton={false} size="sm" className="w-full justify-center">
              Join the network
              <ArrowUpRight data-icon="inline-end" />
            </Button>
          </>
        )}
      </div>
    </aside>
  );
}
