import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
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
import { useContractTemplatesApi } from "../../hooks/useContractTemplatesApi";
import type { Contract, ContractKind } from "../../types/api";

const CONTRACT_KINDS: ContractKind[] = ["SOW", "MSA", "NDA", "GENERIC"];
const TEMPLATE_NONE_VALUE = "__none__";

const formSchema = z.object({
  title: z.string().default(""),
  kind: z.enum(["SOW", "MSA", "NDA", "GENERIC"]).default("SOW"),
  templateId: z.string().default(""),
  dealId: z.string().default(""),
  contactId: z.string().default(""),
  companyId: z.string().default(""),
  quoteId: z.string().default(""),
});

export type ContractFormValues = z.infer<typeof formSchema>;

export function contractToFormValues(c: Contract | undefined): ContractFormValues {
  return {
    title: c?.title ?? "",
    kind: (c?.kind as ContractKind) ?? "SOW",
    templateId: c?.templateId ?? "",
    dealId: c?.dealId ?? "",
    contactId: c?.contactId ?? "",
    companyId: c?.companyId ?? "",
    quoteId: c?.quoteId ?? "",
  };
}

export function formValuesToContract(
  v: ContractFormValues,
  existing?: Contract,
): Contract {
  return {
    ...existing,
    title: v.title || undefined,
    kind: v.kind,
    templateId: v.templateId || undefined,
    dealId: v.dealId || undefined,
    contactId: v.contactId || undefined,
    companyId: v.companyId || undefined,
    quoteId: v.quoteId || undefined,
  };
}

interface ContractFormProps {
  defaultValues: ContractFormValues;
  onSubmit: SubmitHandler<ContractFormValues>;
  submitLabel: string;
  isSubmitting?: boolean;
  onCancel?: () => void;
  /** When true, kind/template cannot be changed (e.g. editing an existing contract). */
  lockedKind?: boolean;
}

export function ContractForm({
  defaultValues,
  onSubmit,
  submitLabel,
  isSubmitting,
  onCancel,
  lockedKind,
}: ContractFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContractFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const templatesApi = useContractTemplatesApi();
  const { data: templates } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: templatesApi.listContractTemplates,
  });

  const kindValue = watch("kind");
  const templateIdValue = watch("templateId");

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-2">
          <Label htmlFor="contract-title">Title</Label>
          <Input
            id="contract-title"
            placeholder="e.g. Website Project SOW"
            aria-invalid={errors.title ? true : undefined}
            {...register("title")}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="contract-kind">Kind</Label>
          <Select
            value={kindValue}
            onValueChange={(v) => setValue("kind", v as ContractKind)}
            disabled={lockedKind}
          >
            <SelectTrigger id="contract-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTRACT_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!lockedKind && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="contract-template">Template</Label>
            <Select
              value={templateIdValue || TEMPLATE_NONE_VALUE}
              onValueChange={(v) =>
                setValue("templateId", v === TEMPLATE_NONE_VALUE ? "" : v)
              }
            >
              <SelectTrigger id="contract-template">
                <SelectValue placeholder="— No template —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TEMPLATE_NONE_VALUE}>— No template —</SelectItem>
                {(templates ?? []).map((t) =>
                  t.id ? (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name ?? t.kind ?? t.id}
                    </SelectItem>
                  ) : null,
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="contract-deal-id">Deal ID (optional)</Label>
          <Input id="contract-deal-id" {...register("dealId")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="contract-quote-id">Quote ID (optional)</Label>
          <Input id="contract-quote-id" {...register("quoteId")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="contract-contact-id">Contact ID (optional)</Label>
          <Input id="contract-contact-id" {...register("contactId")} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="contract-company-id">Company ID (optional)</Label>
          <Input id="contract-company-id" {...register("companyId")} />
        </div>
      </div>

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
