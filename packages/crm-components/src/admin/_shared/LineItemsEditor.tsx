/**
 * LineItemsEditor — reusable line-item table for forms that use react-hook-form.
 *
 * Accepts the form's `register`, `setValue`, and `watch` methods plus the
 * field name that holds the LineItem array. Decoupled from any specific form
 * schema so it can be dropped into the Quote form, RecurringInvoice form, etc.
 *
 * The component owns the "Add line item" / "Remove" interactions and renders
 * the data-testid attributes required by smoke specs.
 */

import { z } from "zod";
import type { UseFormRegister, UseFormSetValue, UseFormWatch, Path, FieldValues } from "react-hook-form";

import { Button } from "../../primitives/button";
import { Input } from "../../primitives/input";
import { Label } from "../../primitives/label";

// ---- shared schema exported so forms can compose it -------------------------

export const lineItemSchema = z.object({
  description: z.string().default(""),
  quantity: z.coerce.number().min(0).default(1),
  unitPrice: z.coerce.number().min(0).default(0),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
});

export type LineItemFormValue = z.infer<typeof lineItemSchema>;

export const defaultLineItem = (): LineItemFormValue => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
  discountPercent: 0,
  taxPercent: 0,
});

// ---- component --------------------------------------------------------------

interface LineItemsEditorProps<TFieldValues extends FieldValues> {
  /** react-hook-form register bound to the parent form */
  register: UseFormRegister<TFieldValues>;
  /** react-hook-form setValue bound to the parent form */
  setValue: UseFormSetValue<TFieldValues>;
  /** react-hook-form watch bound to the parent form */
  watch: UseFormWatch<TFieldValues>;
  /** The dot-notation path in TFieldValues that holds LineItemFormValue[] */
  fieldName: Path<TFieldValues>;
}

export function LineItemsEditor<TFieldValues extends FieldValues>({
  register,
  setValue,
  watch,
  fieldName,
}: LineItemsEditorProps<TFieldValues>) {
  // Watch the array. `watch(fieldName)` is typed as `TFieldValues[Path<TFieldValues>]`
  // which is unknown at the call site, so we cast it.
  const lineItems = (watch(fieldName) ?? []) as LineItemFormValue[];

  function addLineItem() {
    setValue(
      fieldName,
      [...lineItems, defaultLineItem()] as Parameters<typeof setValue>[1],
    );
  }

  function removeLineItem(idx: number) {
    setValue(
      fieldName,
      lineItems.filter((_, i) => i !== idx) as Parameters<typeof setValue>[1],
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label>Line items</Label>
        <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
          Add line item
        </Button>
      </div>

      {lineItems.map((_, idx) => (
        <div
          key={idx}
          className="flex gap-2 items-end border rounded p-2"
          data-testid={`line-item-${idx}`}
        >
          <div className="flex-1 flex flex-col gap-1">
            <Label className="text-xs">Description</Label>
            <Input
              placeholder="Service description"
              {...register(`${fieldName}.${idx}.description` as Path<TFieldValues>)}
            />
          </div>
          <div className="w-20 flex flex-col gap-1">
            <Label className="text-xs">Qty</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              {...register(`${fieldName}.${idx}.quantity` as Path<TFieldValues>)}
            />
          </div>
          <div className="w-24 flex flex-col gap-1">
            <Label className="text-xs">Unit price</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              {...register(`${fieldName}.${idx}.unitPrice` as Path<TFieldValues>)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removeLineItem(idx)}
            data-testid={`remove-line-item-${idx}`}
          >
            Remove
          </Button>
        </div>
      ))}

      {lineItems.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No line items yet — add one above.
        </p>
      )}
    </div>
  );
}
