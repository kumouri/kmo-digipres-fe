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
import type { ContractTemplate, ContractKind } from "../../types/api";

const CONTRACT_KINDS: ContractKind[] = ["SOW", "MSA", "NDA", "GENERIC"];

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().default(""),
  kind: z.enum(["SOW", "MSA", "NDA", "GENERIC"]).default("SOW"),
  defaultTitle: z.string().default(""),
  bodyTemplate: z.string().default(""),
  active: z.boolean().default(true),
});

export type ContractTemplateFormValues = z.infer<typeof formSchema>;

export function templateToFormValues(
  t: ContractTemplate | undefined,
): ContractTemplateFormValues {
  return {
    name: t?.name ?? "",
    description: t?.description ?? "",
    kind: (t?.kind as ContractKind) ?? "SOW",
    defaultTitle: t?.defaultTitle ?? "",
    bodyTemplate: t?.bodyTemplate ?? "",
    active: t?.active ?? true,
  };
}

export function formValuesToTemplate(
  v: ContractTemplateFormValues,
  existing?: ContractTemplate,
): ContractTemplate {
  return {
    ...existing,
    name: v.name,
    description: v.description || undefined,
    kind: v.kind,
    defaultTitle: v.defaultTitle || undefined,
    bodyTemplate: v.bodyTemplate,
    active: v.active,
  };
}

interface ContractTemplateFormProps {
  defaultValues: ContractTemplateFormValues;
  onSubmit: SubmitHandler<ContractTemplateFormValues>;
  submitLabel: string;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function ContractTemplateForm({
  defaultValues,
  onSubmit,
  submitLabel,
  isSubmitting,
  onCancel,
}: ContractTemplateFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContractTemplateFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const kindValue = watch("kind");
  const activeValue = watch("active");

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-2">
          <Label htmlFor="template-name">Name *</Label>
          <Input
            id="template-name"
            aria-invalid={errors.name ? true : undefined}
            {...register("name")}
          />
          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="template-kind">Kind</Label>
          <Select
            value={kindValue}
            onValueChange={(v) => setValue("kind", v as ContractKind)}
          >
            <SelectTrigger id="template-kind">
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="template-active">Active</Label>
          <Select
            value={activeValue ? "true" : "false"}
            onValueChange={(v) => setValue("active", v === "true")}
          >
            <SelectTrigger id="template-active">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 flex flex-col gap-2">
          <Label htmlFor="template-default-title">Default title</Label>
          <Input
            id="template-default-title"
            placeholder="e.g. Statement of Work — {{clientName}}"
            {...register("defaultTitle")}
          />
        </div>

        <div className="col-span-2 flex flex-col gap-2">
          <Label htmlFor="template-description">Description</Label>
          <Input
            id="template-description"
            placeholder="Brief description of this template"
            {...register("description")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="template-body">
          Body template
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            Mustache — use {"{{placeholders}}"} for dynamic values
          </span>
        </Label>
        <textarea
          id="template-body"
          rows={12}
          className="w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="{{clientName}}, this Statement of Work ..."
          data-testid="template-body-textarea"
          {...register("bodyTemplate")}
        />
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
