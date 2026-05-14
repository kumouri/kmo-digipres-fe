import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
import { Textarea } from "@kmosf/crm-components";
import {
  ACTIVITY_DIRECTIONS,
  ACTIVITY_TYPES,
  SUBJECT_TYPES,
  type ActivityDTO,
  type ActivityDirection,
  type ActivityType,
  type SubjectType,
} from "@kmosf/crm-components";

const formSchema = z.object({
  type: z.enum(["NOTE", "EMAIL", "CALL", "MEETING", "TASK"]),
  direction: z.enum(["INBOUND", "OUTBOUND", "INTERNAL"]),
  subjectType: z.enum(["CONTACT", "COMPANY", "DEAL", "WORK_ORDER"]),
  subjectId: z.string().min(1, "Subject ID is required"),
  summary: z.string().min(1, "Summary is required"),
  body: z.string().default(""),
});

export type ActivityFormValues = z.infer<typeof formSchema>;

export function defaultActivityValues(): ActivityFormValues {
  return {
    type: "NOTE",
    direction: "INTERNAL",
    subjectType: "CONTACT",
    subjectId: "",
    summary: "",
    body: "",
  };
}

export function activityToFormValues(a: ActivityDTO | undefined): ActivityFormValues {
  if (!a) return defaultActivityValues();
  return {
    type: a.type ?? "NOTE",
    direction: a.direction ?? "INTERNAL",
    subjectType: a.subjectType ?? "CONTACT",
    subjectId: a.subjectId ?? "",
    summary: a.summary ?? "",
    body: a.body ?? "",
  };
}

export function formValuesToActivity(
  v: ActivityFormValues,
  existing?: ActivityDTO,
): ActivityDTO {
  return {
    ...existing,
    type: v.type,
    direction: v.direction,
    subjectType: v.subjectType,
    subjectId: v.subjectId,
    summary: v.summary,
    body: v.body || undefined,
    // Only stamp occurredAt on initial create — don't overwrite the original
    // timestamp on edit.
    occurredAt: existing?.occurredAt ?? new Date().toISOString(),
  };
}

interface ActivityFormProps {
  onSubmit: SubmitHandler<ActivityFormValues>;
  submitLabel: string;
  defaultValues?: ActivityFormValues;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function ActivityForm({
  onSubmit,
  submitLabel,
  defaultValues,
  isSubmitting,
  onCancel,
}: ActivityFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues ?? defaultActivityValues(),
  });

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="activity-type">Type</Label>
          <Select
            value={watch("type")}
            onValueChange={(v) => setValue("type", v as ActivityType)}
          >
            <SelectTrigger id="activity-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="activity-direction">Direction</Label>
          <Select
            value={watch("direction")}
            onValueChange={(v) => setValue("direction", v as ActivityDirection)}
          >
            <SelectTrigger id="activity-direction">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_DIRECTIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="activity-subject-type">Subject type</Label>
          <Select
            value={watch("subjectType")}
            onValueChange={(v) => setValue("subjectType", v as SubjectType)}
          >
            <SelectTrigger id="activity-subject-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBJECT_TYPES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="activity-subject-id">Subject ID *</Label>
        <Input
          id="activity-subject-id"
          placeholder="UUID of the contact / company / deal / work order"
          aria-invalid={errors.subjectId ? true : undefined}
          {...register("subjectId")}
        />
        {errors.subjectId ? (
          <p className="text-xs text-destructive">{errors.subjectId.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="activity-summary">Summary *</Label>
        <Input
          id="activity-summary"
          aria-invalid={errors.summary ? true : undefined}
          {...register("summary")}
        />
        {errors.summary ? (
          <p className="text-xs text-destructive">{errors.summary.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="activity-body">Body</Label>
        <Textarea id="activity-body" rows={5} {...register("body")} />
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
