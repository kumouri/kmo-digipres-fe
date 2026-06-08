import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "../../primitives/button";
import { Input } from "../../primitives/input";
import { Label } from "../../primitives/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../primitives/select";
import type { RecurringInvoice, LineItem, PaymentTerms } from "../../types/api";
import { PAYMENT_TERMS } from "../../types/api";
import { PAYMENT_TERMS_LABELS, labelFor } from "../labels";
import { lineItemSchema, LineItemsEditor } from "../_shared/LineItemsEditor";

const NONE_VALUE = "__none__";

const formSchema = z.object({
  templateName: z.string().default(""),
  rrule: z.string().default("FREQ=MONTHLY;BYMONTHDAY=1"),
  seedAt: z.string().default(""),
  endAt: z.string().default(""),
  paymentTerms: z.string().default(""),
  currency: z.string().default("USD"),
  autoFinalize: z.boolean().default(false),
  contactId: z.string().default(""),
  companyId: z.string().default(""),
  dealId: z.string().default(""),
  projectId: z.string().default(""),
  lineItems: z.array(lineItemSchema).default([]),
});

export type RecurringInvoiceFormValues = z.infer<typeof formSchema>;

export function recurringInvoiceToFormValues(
  ri: RecurringInvoice | undefined,
): RecurringInvoiceFormValues {
  return {
    templateName: ri?.templateName ?? "",
    rrule: ri?.rrule ?? "FREQ=MONTHLY;BYMONTHDAY=1",
    seedAt: ri?.seedAt ? ri.seedAt.slice(0, 10) : "",
    endAt: ri?.endAt ? ri.endAt.slice(0, 10) : "",
    paymentTerms: ri?.paymentTerms ?? "",
    currency: ri?.currency ?? "USD",
    autoFinalize: ri?.autoFinalize ?? false,
    contactId: ri?.contactId ?? "",
    companyId: ri?.companyId ?? "",
    dealId: ri?.dealId ?? "",
    projectId: ri?.projectId ?? "",
    lineItems: (ri?.lineItems ?? []).map((li) => ({
      description: li.description ?? "",
      quantity: li.quantity ?? 1,
      unitPrice: li.unitPrice ?? 0,
      discountPercent: li.discountPercent ?? 0,
      taxPercent: li.taxPercent ?? 0,
    })),
  };
}

export function formValuesToRecurringInvoice(
  v: RecurringInvoiceFormValues,
  existing?: RecurringInvoice,
): RecurringInvoice {
  const lineItems: LineItem[] = v.lineItems.map((li) => ({
    description: li.description || undefined,
    quantity: li.quantity,
    unitPrice: li.unitPrice,
    discountPercent: li.discountPercent,
    taxPercent: li.taxPercent,
    lineTotal: li.quantity * li.unitPrice * (1 - li.discountPercent / 100),
  }));

  return {
    ...existing,
    templateName: v.templateName || undefined,
    rrule: v.rrule || undefined,
    seedAt: v.seedAt ? `${v.seedAt}T00:00:00Z` : undefined,
    endAt: v.endAt ? `${v.endAt}T00:00:00Z` : undefined,
    paymentTerms: (v.paymentTerms || undefined) as PaymentTerms | undefined,
    currency: v.currency || "USD",
    autoFinalize: v.autoFinalize,
    contactId: v.contactId || undefined,
    companyId: v.companyId || undefined,
    dealId: v.dealId || undefined,
    projectId: v.projectId || undefined,
    lineItems: lineItems.length > 0 ? lineItems : undefined,
  };
}

interface RecurringInvoiceFormProps {
  defaultValues: RecurringInvoiceFormValues;
  onSubmit: SubmitHandler<RecurringInvoiceFormValues>;
  submitLabel: string;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function RecurringInvoiceForm({
  defaultValues,
  onSubmit,
  submitLabel,
  isSubmitting,
  onCancel,
}: RecurringInvoiceFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RecurringInvoiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const paymentTermsValue = watch("paymentTerms");
  const autoFinalizeValue = watch("autoFinalize");

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-2">
          <Label htmlFor="ri-name">Name (optional)</Label>
          <Input
            id="ri-name"
            placeholder="e.g. Monthly retainer"
            aria-invalid={errors.templateName ? true : undefined}
            {...register("templateName")}
          />
        </div>

        <div className="col-span-2 flex flex-col gap-2">
          <Label htmlFor="ri-rrule">Cadence (RRULE)</Label>
          <Input
            id="ri-rrule"
            className="font-mono text-sm"
            placeholder="FREQ=MONTHLY;BYMONTHDAY=1"
            aria-invalid={errors.rrule ? true : undefined}
            {...register("rrule")}
          />
          <p className="text-xs text-muted-foreground">
            RFC-5545 RRULE string. Example: FREQ=MONTHLY;BYMONTHDAY=1 for the 1st of every month.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ri-seed-at">Start date (optional)</Label>
          <Input
            id="ri-seed-at"
            type="date"
            {...register("seedAt")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ri-end-at">End date (optional)</Label>
          <Input
            id="ri-end-at"
            type="date"
            {...register("endAt")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ri-currency">Currency</Label>
          <Input
            id="ri-currency"
            placeholder="USD"
            {...register("currency")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ri-payment-terms">Payment terms</Label>
          <Select
            value={paymentTermsValue || NONE_VALUE}
            onValueChange={(v) =>
              setValue("paymentTerms", v === NONE_VALUE ? "" : v)
            }
          >
            <SelectTrigger id="ri-payment-terms">
              <SelectValue placeholder="— Default —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>— Default —</SelectItem>
              {PAYMENT_TERMS.map((pt) => (
                <SelectItem key={pt} value={pt}>
                  {labelFor(PAYMENT_TERMS_LABELS, pt, pt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 flex items-center gap-2">
          <input
            id="ri-auto-finalize"
            type="checkbox"
            className="size-4 rounded border"
            checked={autoFinalizeValue}
            onChange={(e) => setValue("autoFinalize", e.target.checked)}
            data-testid="recurring-auto-finalize"
          />
          <Label htmlFor="ri-auto-finalize">
            Auto-finalize — send spawned invoices automatically (skip draft)
          </Label>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ri-contact-id">Contact ID (optional)</Label>
          <Input id="ri-contact-id" {...register("contactId")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ri-company-id">Company ID (optional)</Label>
          <Input id="ri-company-id" {...register("companyId")} />
        </div>
      </div>

      {/* Line items */}
      <LineItemsEditor
        register={register}
        setValue={setValue}
        watch={watch}
        fieldName="lineItems"
      />

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
