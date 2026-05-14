import { useState } from "react";

import { Button } from "../primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../primitives/card";
import { Input } from "../primitives/input";
import { Label } from "../primitives/label";
import { Textarea } from "../primitives/textarea";

export interface PublicContactFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
}

export interface PublicContactFormProps {
  /** Backend base URL (e.g. `https://api.example.com/api`). */
  apiBaseUrl: string;
  /** Tenant slug — resolves which tenant's Contact collection to write into. */
  tenantSlug: string;
  /** Optional callback fired after a successful submission. */
  onSubmitted?: (values: PublicContactFormValues) => void;
  className?: string;
}

const EMPTY: PublicContactFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  message: "",
};

/**
 * Anonymous lead-capture form. Submits to `POST /public/{tenantSlug}/contacts`
 * on the KMOSF CRM backend. The BE enforces:
 *  - `email` required + valid
 *  - at least one of `firstName` / `lastName`
 *  - per-IP, per-tenant rate limit (~10/min)
 * — surface backend errors via the inline `submitError` field.
 */
export function PublicContactForm({
  apiBaseUrl,
  tenantSlug,
  onSubmitted,
  className,
}: PublicContactFormProps) {
  const [values, setValues] = useState<PublicContactFormValues>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const endpoint = `${apiBaseUrl}/public/${encodeURIComponent(tenantSlug)}/contacts`;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          firstName: values.firstName || undefined,
          lastName: values.lastName || undefined,
          email: values.email,
          phone: values.phone || undefined,
          message: values.message || undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          text || `Submission failed (${res.status} ${res.statusText}).`,
        );
      }
      setSuccess(true);
      onSubmitted?.(values);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Submission failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <Card className={className} data-testid="public-contact-form-success">
        <CardHeader>
          <CardTitle>Thanks — we got your message.</CardTitle>
          <CardDescription>
            Someone from the team will reach out to {values.email}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => {
              setValues(EMPTY);
              setSuccess(false);
            }}
          >
            Send another
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} data-testid="public-contact-form">
      <CardHeader>
        <CardTitle>Get in touch</CardTitle>
        <CardDescription>
          Submissions post to <code>{endpoint}</code>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="pcf-first">First name</Label>
              <Input
                id="pcf-first"
                value={values.firstName}
                onChange={(e) =>
                  setValues((s) => ({ ...s, firstName: e.target.value }))
                }
                data-testid="pcf-first-name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pcf-last">Last name</Label>
              <Input
                id="pcf-last"
                value={values.lastName}
                onChange={(e) =>
                  setValues((s) => ({ ...s, lastName: e.target.value }))
                }
                data-testid="pcf-last-name"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pcf-email">Email *</Label>
            <Input
              id="pcf-email"
              type="email"
              required
              value={values.email}
              onChange={(e) =>
                setValues((s) => ({ ...s, email: e.target.value }))
              }
              data-testid="pcf-email"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pcf-phone">Phone</Label>
            <Input
              id="pcf-phone"
              value={values.phone}
              onChange={(e) =>
                setValues((s) => ({ ...s, phone: e.target.value }))
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pcf-message">Message</Label>
            <Textarea
              id="pcf-message"
              rows={4}
              value={values.message}
              onChange={(e) =>
                setValues((s) => ({ ...s, message: e.target.value }))
              }
            />
          </div>
          {submitError ? (
            <p className="text-xs text-destructive">{submitError}</p>
          ) : null}
          <Button
            type="submit"
            disabled={
              submitting ||
              !values.email.trim() ||
              (!values.firstName.trim() && !values.lastName.trim())
            }
            data-testid="pcf-submit"
          >
            {submitting ? "Sending…" : "Send"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
