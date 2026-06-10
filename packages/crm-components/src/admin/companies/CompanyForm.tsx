import { useFieldArray, useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@kmosf/crm-components";
import { Input } from "@kmosf/crm-components";
import { Label } from "@kmosf/crm-components";
import type { CompanyDTO } from "@kmosf/crm-components";

const addressSchema = z.object({
  street: z.string().default(""),
  city: z.string().default(""),
  region: z.string().default(""),
  postalCode: z.string().default(""),
  country: z.string().default(""),
  label: z.string().default(""),
});

// Security FE-01: a company website is rendered into an `href`. Restrict it to
// an http(s) URL (or empty) at the input boundary so a `javascript:`/`data:`
// scheme can never be stored. The render side (CompaniesList) also guards via
// safeHref — this is defense-in-depth plus a friendly inline validation error.
const websiteSchema = z
  .string()
  .default("")
  .refine(
    (v) => {
      const trimmed = v.trim();
      if (trimmed === "") return true; // optional field
      try {
        const parsed = new URL(trimmed);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Enter a valid http(s) URL (e.g. https://example.com)" },
  );

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  website: websiteSchema,
  industry: z.string().default(""),
  addresses: z.array(addressSchema),
  tags: z.string().default(""),
});

export type CompanyFormValues = z.infer<typeof formSchema>;

export function companyToFormValues(c: CompanyDTO | undefined): CompanyFormValues {
  return {
    name: c?.name ?? "",
    website: c?.website ?? "",
    industry: c?.industry ?? "",
    addresses: (c?.addresses ?? []).map((a) => ({
      street: a.street ?? "",
      city: a.city ?? "",
      region: a.region ?? "",
      postalCode: a.postalCode ?? "",
      country: a.country ?? "",
      label: a.label ?? "",
    })),
    tags: (c?.tags ?? []).join(", "),
  };
}

export function formValuesToCompany(v: CompanyFormValues, existing?: CompanyDTO): CompanyDTO {
  return {
    ...existing,
    name: v.name,
    website: v.website || undefined,
    industry: v.industry || undefined,
    addresses: v.addresses.filter(
      (a) => a.street || a.city || a.region || a.postalCode || a.country,
    ),
    tags: v.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  };
}

interface CompanyFormProps {
  defaultValues: CompanyFormValues;
  onSubmit: SubmitHandler<CompanyFormValues>;
  submitLabel: string;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function CompanyForm({
  defaultValues,
  onSubmit,
  submitLabel,
  isSubmitting,
  onCancel,
}: CompanyFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const addresses = useFieldArray({ control, name: "addresses" });

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="company-name">Name *</Label>
        <Input
          id="company-name"
          aria-invalid={errors.name ? true : undefined}
          {...register("name")}
        />
        {errors.name ? (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="company-website">Website</Label>
          <Input
            id="company-website"
            placeholder="https://"
            aria-invalid={errors.website ? true : undefined}
            {...register("website")}
          />
          {errors.website ? (
            <p className="text-xs text-destructive">{errors.website.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="company-industry">Industry</Label>
          <Input id="company-industry" {...register("industry")} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="company-tags">Tags</Label>
        <Input
          id="company-tags"
          placeholder="comma, separated"
          {...register("tags")}
        />
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Addresses</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              addresses.append({
                street: "",
                city: "",
                region: "",
                postalCode: "",
                country: "",
                label: "",
              })
            }
          >
            <Plus /> Add address
          </Button>
        </div>
        {addresses.fields.length === 0 ? (
          <p className="text-xs text-muted-foreground">No addresses yet.</p>
        ) : (
          addresses.fields.map((field, i) => (
            <div key={field.id} className="grid grid-cols-2 gap-2 rounded-md border p-3">
              <Input placeholder="Street" {...register(`addresses.${i}.street` as const)} />
              <Input placeholder="City" {...register(`addresses.${i}.city` as const)} />
              <Input placeholder="Region" {...register(`addresses.${i}.region` as const)} />
              <Input placeholder="Postal code" {...register(`addresses.${i}.postalCode` as const)} />
              <Input placeholder="Country" {...register(`addresses.${i}.country` as const)} />
              <Input placeholder="Label" {...register(`addresses.${i}.label` as const)} />
              <div className="col-span-2 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => addresses.remove(i)}
                >
                  <Trash2 /> Remove address
                </Button>
              </div>
            </div>
          ))
        )}
      </section>

      <div className="flex justify-end gap-2 border-t pt-4">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
