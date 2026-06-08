/**
 * QuoteForm — react-hook-form form for creating and editing quotes.
 *
 * Supports currency, notes, expiry date, and a full line-item editor.
 * Used from QuotesList (create dialog) and QuoteDetail (edit).
 */

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "../../primitives/button";
import { Input } from "../../primitives/input";
import { Label } from "../../primitives/label";
import type { Quote, LineItem } from "../../types/api";
import { lineItemSchema, LineItemsEditor } from "../_shared/LineItemsEditor";

const formSchema = z.object({
  currency: z.string().default("USD"),
  expiresAt: z.string().default(""),
  notes: z.string().default(""),
  lineItems: z.array(lineItemSchema).default([]),
});

export type QuoteFormValues = z.infer<typeof formSchema>;

export function quoteToFormValues(quote: Quote | undefined): QuoteFormValues {
  return {
    currency: quote?.currency ?? "USD",
    expiresAt: quote?.expiresAt ? quote.expiresAt.slice(0, 10) : "",
    notes: quote?.notes ?? "",
    lineItems: (quote?.lineItems ?? []).map((li) => ({
      description: li.description ?? "",
      quantity: li.quantity ?? 1,
      unitPrice: li.unitPrice ?? 0,
      discountPercent: li.discountPercent ?? 0,
      taxPercent: li.taxPercent ?? 0,
    })),
  };
}

export function formValuesToQuote(
  v: QuoteFormValues,
  existing?: Quote,
): Quote {
  const lineItems: LineItem[] = v.lineItems.map((li) => ({
    description: li.description || undefined,
    quantity: li.quantity,
    unitPrice: li.unitPrice,
    discountPercent: li.discountPercent,
    taxPercent: li.taxPercent,
    lineTotal: li.quantity * li.unitPrice * (1 - li.discountPercent / 100),
  }));

  const subtotal = lineItems.reduce((sum, li) => sum + (li.lineTotal ?? 0), 0);

  return {
    ...existing,
    currency: v.currency || "USD",
    expiresAt: v.expiresAt ? `${v.expiresAt}T00:00:00Z` : undefined,
    notes: v.notes || undefined,
    lineItems: lineItems.length > 0 ? lineItems : [],
    subtotal,
    discountTotal: 0,
    taxTotal: 0,
    total: subtotal,
  };
}

interface QuoteFormProps {
  defaultValues: QuoteFormValues;
  onSubmit: SubmitHandler<QuoteFormValues>;
  submitLabel: string;
  isSubmitting?: boolean;
  onCancel?: () => void;
  /** Optional data-testid for the submit button (e.g. "create-quote-submit") */
  submitTestId?: string;
}

export function QuoteForm({
  defaultValues,
  onSubmit,
  submitLabel,
  isSubmitting,
  onCancel,
  submitTestId,
}: QuoteFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="q-currency">Currency</Label>
          <Input
            id="q-currency"
            placeholder="USD"
            aria-invalid={errors.currency ? true : undefined}
            {...register("currency")}
            data-testid="quote-currency-input"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="q-expires-at">Expires (optional)</Label>
          <Input
            id="q-expires-at"
            type="date"
            {...register("expiresAt")}
          />
        </div>

        <div className="col-span-2 flex flex-col gap-2">
          <Label htmlFor="q-notes">Notes (optional)</Label>
          <Input
            id="q-notes"
            placeholder="Notes visible on the quote"
            {...register("notes")}
          />
        </div>
      </div>

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
        <Button
          type="submit"
          disabled={isSubmitting}
          {...(submitTestId ? { "data-testid": submitTestId } : {})}
        >
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
