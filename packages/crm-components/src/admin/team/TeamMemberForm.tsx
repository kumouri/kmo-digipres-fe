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
import type {
  TeamMember,
  TeamMemberRequest,
  UserRole,
} from "../../types/api";
import { ROLE_LABELS, USER_STATUS_LABELS, labelFor } from "../labels";

// Roles selectable from this form. The owner (ADMIN) is granted out-of-band,
// never here. Default to CONTRACTOR — the common case for this feature.
const ROLE_OPTIONS: UserRole[] = ["CONTRACTOR", "STAFF"];

// Statuses an admin can set directly. ACTIVE/INVITED are the live ones; a
// member is deactivated from the detail page's Deactivate action, but we keep
// DISABLED selectable so editing a deactivated member round-trips cleanly.
const STATUS_OPTIONS = ["ACTIVE", "INVITED", "DISABLED"] as const;

const moneyString = z
  .union([
    z.literal(""),
    z
      .string()
      .regex(
        /^\d+(\.\d{1,2})?$/,
        "Use a non-negative number with at most 2 decimal places",
      ),
  ])
  .default("");

const formSchema = z.object({
  displayName: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  role: z.enum(["CONTRACTOR", "STAFF"]).default("CONTRACTOR"),
  status: z.enum(STATUS_OPTIONS).default("INVITED"),
  defaultBillRate: moneyString,
  defaultCostRate: moneyString,
});

export type TeamMemberFormValues = z.infer<typeof formSchema>;

// CONTRACTOR implies STAFF on the backend; surface a single role for editing by
// collapsing the roles array to the most specific one.
function roleFromMember(m: TeamMember | undefined): "CONTRACTOR" | "STAFF" {
  return m?.roles?.includes("CONTRACTOR") ? "CONTRACTOR" : "STAFF";
}

export function teamMemberToFormValues(
  m: TeamMember | undefined,
): TeamMemberFormValues {
  return {
    displayName: m?.displayName ?? "",
    email: m?.email ?? "",
    role: roleFromMember(m),
    status: (m?.status as (typeof STATUS_OPTIONS)[number]) ?? "INVITED",
    defaultBillRate: m?.defaultBillRate != null ? String(m.defaultBillRate) : "",
    defaultCostRate: m?.defaultCostRate != null ? String(m.defaultCostRate) : "",
  };
}

export function formValuesToTeamMember(
  v: TeamMemberFormValues,
): TeamMemberRequest {
  // CONTRACTOR implies STAFF — send both so the role set is explicit.
  const roles = v.role === "CONTRACTOR" ? ["STAFF", "CONTRACTOR"] : ["STAFF"];
  const bill = v.defaultBillRate.trim() ? Number(v.defaultBillRate) : undefined;
  const cost = v.defaultCostRate.trim() ? Number(v.defaultCostRate) : undefined;
  return {
    displayName: v.displayName,
    email: v.email,
    roles,
    status: v.status,
    defaultBillRate: Number.isFinite(bill as number) ? bill : undefined,
    defaultCostRate: Number.isFinite(cost as number) ? cost : undefined,
  };
}

interface TeamMemberFormProps {
  defaultValues: TeamMemberFormValues;
  onSubmit: SubmitHandler<TeamMemberFormValues>;
  submitLabel: string;
  isSubmitting?: boolean;
  onCancel?: () => void;
  /** Email is the account identity; lock it on edit. */
  emailLocked?: boolean;
}

export function TeamMemberForm({
  defaultValues,
  onSubmit,
  submitLabel,
  isSubmitting,
  onCancel,
  emailLocked,
}: TeamMemberFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TeamMemberFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="member-name">Name *</Label>
        <Input
          id="member-name"
          data-testid="member-name"
          aria-invalid={errors.displayName ? true : undefined}
          {...register("displayName")}
        />
        {errors.displayName ? (
          <p className="text-xs text-destructive">{errors.displayName.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="member-email">Email *</Label>
        <Input
          id="member-email"
          type="email"
          data-testid="member-email"
          placeholder="name@example.com"
          disabled={emailLocked}
          aria-invalid={errors.email ? true : undefined}
          {...register("email")}
        />
        {errors.email ? (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="member-role">Role</Label>
          <Select
            value={watch("role")}
            onValueChange={(v) => setValue("role", v as "CONTRACTOR" | "STAFF")}
          >
            <SelectTrigger id="member-role" data-testid="member-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {labelFor(ROLE_LABELS, r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="member-status">Status</Label>
          <Select
            value={watch("status")}
            onValueChange={(v) =>
              setValue("status", v as (typeof STATUS_OPTIONS)[number])
            }
          >
            <SelectTrigger id="member-status" data-testid="member-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {labelFor(USER_STATUS_LABELS, s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="member-bill-rate">Default bill rate</Label>
          <Input
            id="member-bill-rate"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            data-testid="member-bill-rate"
            aria-invalid={errors.defaultBillRate ? true : undefined}
            {...register("defaultBillRate")}
          />
          {errors.defaultBillRate ? (
            <p className="text-xs text-destructive">
              {errors.defaultBillRate.message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="member-cost-rate">Default cost rate</Label>
          <Input
            id="member-cost-rate"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            data-testid="member-cost-rate"
            aria-invalid={errors.defaultCostRate ? true : undefined}
            {...register("defaultCostRate")}
          />
          {errors.defaultCostRate ? (
            <p className="text-xs text-destructive">
              {errors.defaultCostRate.message}
            </p>
          ) : null}
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
