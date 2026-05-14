import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import * as companiesApi from "@/api/companies";
import * as contactsApi from "@/api/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PIPELINE_STAGES, type DealDTO, type PipelineStage } from "@/types/api";

const NONE = "__none__";

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"] as const;

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  stage: z.enum(["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]),
  value: z
    .union([
      z.literal(""),
      z
        .string()
        .regex(
          /^\d+(\.\d{1,2})?$/,
          "Use a non-negative number with at most 2 decimal places",
        ),
    ])
    .default(""),
  currency: z.enum(CURRENCY_OPTIONS).default("USD"),
  expectedCloseDate: z.string().default(""),
  primaryContactId: z.string().default(""),
  companyId: z.string().default(""),
  lostReason: z.string().default(""),
});

export type DealFormValues = z.infer<typeof formSchema>;

type CurrencyOption = (typeof CURRENCY_OPTIONS)[number];

function coerceCurrency(value: string | undefined): CurrencyOption {
  return CURRENCY_OPTIONS.includes(value as CurrencyOption)
    ? (value as CurrencyOption)
    : "USD";
}

export function dealToFormValues(d: DealDTO | undefined): DealFormValues {
  return {
    title: d?.title ?? "",
    stage: d?.stage ?? "NEW",
    value: d?.value != null ? String(d.value) : "",
    currency: coerceCurrency(d?.currency),
    expectedCloseDate: d?.expectedCloseDate ?? "",
    primaryContactId: d?.primaryContactId ?? "",
    companyId: d?.companyId ?? "",
    lostReason: d?.lostReason ?? "",
  };
}

export function formValuesToDeal(v: DealFormValues, existing?: DealDTO): DealDTO {
  const value = v.value.trim() ? Number(v.value) : undefined;
  return {
    ...existing,
    title: v.title,
    stage: v.stage,
    value: Number.isFinite(value as number) ? value : undefined,
    currency: v.currency || undefined,
    expectedCloseDate: v.expectedCloseDate || undefined,
    primaryContactId: v.primaryContactId || undefined,
    companyId: v.companyId || undefined,
    lostReason: v.stage === "LOST" ? v.lostReason || undefined : undefined,
  };
}

interface DealFormProps {
  defaultValues: DealFormValues;
  onSubmit: SubmitHandler<DealFormValues>;
  submitLabel: string;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function DealForm({
  defaultValues,
  onSubmit,
  submitLabel,
  isSubmitting,
  onCancel,
}: DealFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DealFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const stage = watch("stage");

  const companiesQ = useQuery({ queryKey: ["companies"], queryFn: companiesApi.listCompanies });
  const contactsQ = useQuery({ queryKey: ["contacts"], queryFn: contactsApi.listContacts });

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="deal-title">Title *</Label>
        <Input
          id="deal-title"
          aria-invalid={errors.title ? true : undefined}
          {...register("title")}
        />
        {errors.title ? (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="deal-stage">Stage</Label>
          <Select
            value={stage}
            onValueChange={(v) => setValue("stage", v as PipelineStage)}
          >
            <SelectTrigger id="deal-stage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="deal-close">Expected close date</Label>
          <Input id="deal-close" type="date" {...register("expectedCloseDate")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="deal-value">Value</Label>
          <Input
            id="deal-value"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            aria-invalid={errors.value ? true : undefined}
            {...register("value")}
          />
          {errors.value ? (
            <p className="text-xs text-destructive">{errors.value.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="deal-currency">Currency</Label>
          <Select
            value={watch("currency")}
            onValueChange={(v) =>
              setValue("currency", v as (typeof CURRENCY_OPTIONS)[number])
            }
          >
            <SelectTrigger id="deal-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="deal-contact">Primary contact</Label>
        <Select
          value={watch("primaryContactId") || NONE}
          onValueChange={(v) => setValue("primaryContactId", v === NONE ? "" : v)}
        >
          <SelectTrigger id="deal-contact">
            <SelectValue placeholder="Pick a contact" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— No contact —</SelectItem>
            {contactsQ.data?.map((c) =>
              c.id ? (
                <SelectItem key={c.id} value={c.id}>
                  {c.displayName ?? c.id}
                </SelectItem>
              ) : null,
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="deal-company">Company</Label>
        <Select
          value={watch("companyId") || NONE}
          onValueChange={(v) => setValue("companyId", v === NONE ? "" : v)}
        >
          <SelectTrigger id="deal-company">
            <SelectValue placeholder="Pick a company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— No company —</SelectItem>
            {companiesQ.data?.map((c) =>
              c.id ? (
                <SelectItem key={c.id} value={c.id}>
                  {c.name ?? c.id}
                </SelectItem>
              ) : null,
            )}
          </SelectContent>
        </Select>
      </div>

      {stage === "LOST" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="deal-lost-reason">Lost reason</Label>
          <Input
            id="deal-lost-reason"
            placeholder="Required when stage is LOST"
            {...register("lostReason")}
          />
        </div>
      ) : null}

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
