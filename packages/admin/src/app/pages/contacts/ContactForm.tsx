import { useFieldArray, useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";

import * as companiesApi from "@/api/companies";
import { Button } from "@kmosf/crm-components";
import { Input } from "@kmosf/crm-components";
import { Label } from "@kmosf/crm-components";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kmosf/crm-components";
import type { ContactDTO } from "@kmosf/crm-components";

const COMPANY_NONE_VALUE = "__none__";

const phoneSchema = z.object({
  number: z.string().min(1, "Required"),
  label: z.string().default(""),
});

const addressSchema = z.object({
  street: z.string().default(""),
  city: z.string().default(""),
  region: z.string().default(""),
  postalCode: z.string().default(""),
  country: z.string().default(""),
  label: z.string().default(""),
});

const formSchema = z.object({
  type: z.enum(["PERSON", "ORG"]).default("PERSON"),
  firstName: z.string().default(""),
  lastName: z.string().default(""),
  displayName: z.string().min(1, "Display name is required"),
  companyId: z.string().default(""),
  emails: z.array(z.object({ value: z.string().email("Invalid email") })),
  phones: z.array(phoneSchema),
  addresses: z.array(addressSchema),
  tags: z.string().default(""), // comma-separated UI shape; serialized to array
});

export type ContactFormValues = z.infer<typeof formSchema>;

export function contactToFormValues(c: ContactDTO | undefined): ContactFormValues {
  return {
    type: c?.type ?? "PERSON",
    firstName: c?.firstName ?? "",
    lastName: c?.lastName ?? "",
    displayName: c?.displayName ?? "",
    companyId: c?.companyId ?? "",
    emails: (c?.emails ?? []).map((value) => ({ value })),
    phones: (c?.phones ?? []).map((p) => ({ number: p.number, label: p.label ?? "" })),
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

export function formValuesToContact(v: ContactFormValues, existing?: ContactDTO): ContactDTO {
  const tags = v.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return {
    ...existing,
    type: v.type,
    firstName: v.firstName || undefined,
    lastName: v.lastName || undefined,
    displayName: v.displayName,
    companyId: v.companyId || undefined,
    emails: v.emails.map((e) => e.value).filter(Boolean),
    phones: v.phones.filter((p) => p.number),
    addresses: v.addresses.filter(
      (a) => a.street || a.city || a.region || a.postalCode || a.country,
    ),
    tags,
  };
}

interface CompanySelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

function CompanySelect({ value, onValueChange }: CompanySelectProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: companiesApi.listCompanies,
  });

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="company-id">Company</Label>
      <Select
        value={value || COMPANY_NONE_VALUE}
        onValueChange={(v) => onValueChange(v === COMPANY_NONE_VALUE ? "" : v)}
      >
        <SelectTrigger id="company-id">
          <SelectValue placeholder={isLoading ? "Loading…" : "Pick a company"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={COMPANY_NONE_VALUE}>— No company —</SelectItem>
          {data?.map((c) =>
            c.id ? (
              <SelectItem key={c.id} value={c.id}>
                {c.name ?? c.id}
              </SelectItem>
            ) : null,
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

interface ContactFormProps {
  defaultValues: ContactFormValues;
  onSubmit: SubmitHandler<ContactFormValues>;
  submitLabel: string;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function ContactForm({
  defaultValues,
  onSubmit,
  submitLabel,
  isSubmitting,
  onCancel,
}: ContactFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const emails = useFieldArray({ control, name: "emails" });
  const phones = useFieldArray({ control, name: "phones" });
  const addresses = useFieldArray({ control, name: "addresses" });
  const typeValue = watch("type");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="contact-type">Type</Label>
          <Select
            value={typeValue}
            onValueChange={(v) => setValue("type", v as "PERSON" | "ORG")}
          >
            <SelectTrigger id="contact-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERSON">Person</SelectItem>
              <SelectItem value="ORG">Organization</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="display-name">Display name *</Label>
          <Input
            id="display-name"
            aria-invalid={errors.displayName ? true : undefined}
            {...register("displayName")}
          />
          {errors.displayName ? (
            <p className="text-xs text-destructive">{errors.displayName.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="first-name">First name</Label>
          <Input id="first-name" {...register("firstName")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="last-name">Last name</Label>
          <Input id="last-name" {...register("lastName")} />
        </div>
      </div>

      <CompanySelect
        value={watch("companyId")}
        onValueChange={(v) => setValue("companyId", v)}
      />


      <div className="flex flex-col gap-2">
        <Label htmlFor="tags">Tags</Label>
        <Input id="tags" placeholder="comma, separated" {...register("tags")} />
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Emails</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => emails.append({ value: "" })}
          >
            <Plus /> Add email
          </Button>
        </div>
        {emails.fields.length === 0 ? (
          <p className="text-xs text-muted-foreground">No emails yet.</p>
        ) : (
          emails.fields.map((field, i) => (
            <div key={field.id} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  aria-invalid={errors.emails?.[i]?.value ? true : undefined}
                  {...register(`emails.${i}.value` as const)}
                />
                {errors.emails?.[i]?.value ? (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.emails[i]?.value?.message}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => emails.remove(i)}
                aria-label="Remove email"
              >
                <Trash2 />
              </Button>
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Phones</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => phones.append({ number: "", label: "" })}
          >
            <Plus /> Add phone
          </Button>
        </div>
        {phones.fields.length === 0 ? (
          <p className="text-xs text-muted-foreground">No phones yet.</p>
        ) : (
          phones.fields.map((field, i) => (
            <div key={field.id} className="flex items-start gap-2">
              <Input
                placeholder="+1 555 ..."
                className="flex-1"
                {...register(`phones.${i}.number` as const)}
              />
              <Input
                placeholder="label (work, mobile)"
                className="flex-1"
                {...register(`phones.${i}.label` as const)}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => phones.remove(i)}
                aria-label="Remove phone"
              >
                <Trash2 />
              </Button>
            </div>
          ))
        )}
      </section>

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
