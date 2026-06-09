import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  Bot,
  Download,
  FileSignature,
  FileText,
  Loader2,
  ScrollText,
  Send,
  Sparkles,
} from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import { Label } from "../../primitives/label";
import { Textarea } from "../../primitives/textarea";
import { useProposalsApi } from "../../hooks/useProposalsApi";
import type { ProposalDraftResult } from "../../api/proposals";
import type { Quote } from "../../types/api";
import { PROPOSAL_SECTION_LABELS } from "../labels";
import { ApiError } from "../../api/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number | null | undefined, currency: string): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Line-items table
// ---------------------------------------------------------------------------

function LineItemsTable({ quote }: { quote: Quote }) {
  const currency = quote.currency ?? "USD";
  const items = quote.lineItems ?? [];

  return (
    <div
      className="overflow-x-auto rounded-md border"
      data-testid="proposal-line-items"
    >
      <table className="min-w-full divide-y text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">
              Description
            </th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground">
              Qty
            </th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground">
              Unit price
            </th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="divide-y bg-background">
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-4 text-center text-muted-foreground"
              >
                No line items.
              </td>
            </tr>
          ) : (
            items.map((item, idx) => (
              <tr key={idx} data-testid="proposal-line-item">
                <td className="px-4 py-2">
                  {item.description ?? item.sku ?? "—"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {item.quantity != null ? Number(item.quantity) : "—"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatCurrency(
                    item.unitPrice != null ? Number(item.unitPrice) : null,
                    currency,
                  )}
                </td>
                <td className="px-4 py-2 text-right tabular-nums font-medium">
                  {formatCurrency(
                    item.lineTotal != null ? Number(item.lineTotal) : null,
                    currency,
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot className="bg-muted/30">
          {quote.subtotal != null && quote.total !== quote.subtotal ? (
            <tr>
              <td
                colSpan={3}
                className="px-4 py-1.5 text-right text-xs text-muted-foreground"
              >
                Subtotal
              </td>
              <td className="px-4 py-1.5 text-right text-xs tabular-nums text-muted-foreground">
                {formatCurrency(Number(quote.subtotal), currency)}
              </td>
            </tr>
          ) : null}
          <tr>
            <td
              colSpan={3}
              className="px-4 py-2 text-right text-sm font-semibold"
              data-testid="proposal-total-label"
            >
              Total
            </td>
            <td
              className="px-4 py-2 text-right text-sm font-semibold tabular-nums"
              data-testid="proposal-total-amount"
            >
              {formatCurrency(
                quote.total != null ? Number(quote.total) : null,
                currency,
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SOW prose sections
// ---------------------------------------------------------------------------

interface ProseSection {
  key: keyof typeof PROPOSAL_SECTION_LABELS;
  value: string | null | undefined;
}

function ProseSections({ draft }: { draft: ProposalDraftResult }) {
  const sow = draft.sowDraft;

  const sections: ProseSection[] = [
    { key: "scope", value: sow?.scope },
    { key: "deliverables", value: sow?.deliverables },
    { key: "assumptions", value: sow?.assumptions },
    { key: "timeline", value: sow?.timeline },
  ];

  return (
    <div className="flex flex-col gap-4" data-testid="proposal-prose-sections">
      {sections.map(({ key, value }) => (
        <Card key={key} data-testid={`proposal-prose-${key}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {PROPOSAL_SECTION_LABELS[key]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {value?.trim() ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {value}
              </p>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                Nothing drafted here yet — fill this section in before sending.
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Send-for-signature affordance
// ---------------------------------------------------------------------------

function SendForSignatureNote({ quoteId }: { quoteId: string }) {
  return (
    <Card
      className="border-dashed bg-muted/30"
      data-testid="proposal-send-for-signature"
    >
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-2">
          <FileSignature className="size-4 text-muted-foreground" />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">Ready to send for signature?</p>
            <p className="text-xs text-muted-foreground">
              Head to the Quotes page and use{" "}
              <span className="font-medium">Send for signature</span> to spawn a
              contract from this draft.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          asChild
          data-testid="proposal-go-to-quote"
        >
          <a href={`/quotes/${quoteId}`}>
            <Send className="size-4" />
            Open quote
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Draft result panel
// ---------------------------------------------------------------------------

function DraftResultPanel({
  draft,
  pdfUrl,
}: {
  draft: ProposalDraftResult;
  pdfUrl: string;
}) {
  const { quote, sowDraft } = draft;
  const aiApplied = sowDraft?.aiApplied ?? false;

  return (
    <div className="flex flex-col gap-6" data-testid="proposal-draft-result">
      {/* AI-unavailable notice */}
      {!aiApplied && (
        <div
          className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50/40 px-4 py-3 dark:border-amber-700/40 dark:bg-amber-900/10"
          data-testid="proposal-ai-unavailable-notice"
        >
          <Bot className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            AI was unavailable for this draft — the sections below are empty.
            Fill them in before sending.
          </p>
        </div>
      )}

      {/* Priced quote */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Priced quote
          </h2>
          {quote.quoteNumber ? (
            <Badge variant="secondary" data-testid="proposal-quote-number">
              #{quote.quoteNumber}
            </Badge>
          ) : null}
        </div>
        <LineItemsTable quote={quote} />
      </section>

      {/* SOW prose sections */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <ScrollText className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Statement of work
          </h2>
          {aiApplied && (
            <Badge
              variant="secondary"
              className="gap-1"
              data-testid="proposal-ai-badge"
            >
              <Sparkles className="size-3" />
              AI-drafted
            </Badge>
          )}
        </div>
        <ProseSections draft={draft} />
      </section>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          asChild
          data-testid="proposal-download-pdf"
        >
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            <Download className="size-4" />
            Download SOW PDF
          </a>
        </Button>
      </div>

      {/* Send-for-signature path */}
      <SendForSignatureNote quoteId={quote.id!} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function ProposalStudio() {
  const api = useProposalsApi();

  const [notes, setNotes] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  // Once a draft is created, store the result + the proposal ID to allow
  // re-fetching (the GET /proposals/{id} path).
  const [draftResult, setDraftResult] = useState<ProposalDraftResult | null>(
    null,
  );

  const { mutate: draft, isPending } = useMutation({
    mutationFn: () => api.draftProposal({ notes }),
    onSuccess: (result) => {
      setDraftResult(result);
      setFieldError(null);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 400) {
          // 4621: notes blank or over max length
          setFieldError(
            "Discovery notes are required and can't be longer than 8,000 characters.",
          );
        } else if (err.status === 404) {
          // 4620: proposals module not enabled for this account
          setFieldError(
            "Proposals isn't enabled for this account. Ask your account owner to turn on the module.",
          );
        } else {
          setFieldError(`Something went wrong (${err.status}).`);
        }
      } else {
        setFieldError("Couldn't create the draft — please try again.");
      }
    },
  });

  const canDraft = notes.trim().length > 0 && notes.length <= 8000 && !isPending;
  const pdfUrl = draftResult
    ? api.getProposalPdfUrl(draftResult.quote.id!)
    : "";

  return (
    <section className="flex flex-col gap-6" data-testid="proposal-studio-page">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-medium">
          <Sparkles className="size-6 text-muted-foreground" />
          Proposal / SOW Studio
        </h1>
        <p className="text-sm text-muted-foreground">
          Describe the engagement in plain notes and let AI draft a priced
          statement of work for you. Review it, download the PDF, then send it
          for signature.
        </p>
      </header>

      {/* Discovery-notes input */}
      <Card data-testid="proposal-notes-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Discovery notes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Label htmlFor="proposal-notes" className="sr-only">
            Discovery notes
          </Label>
          <Textarea
            id="proposal-notes"
            placeholder={
              "What's the engagement about? Paste in meeting notes, a brief scope description, or anything you know about the project — the more context, the better the draft."
            }
            rows={8}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setFieldError(null);
            }}
            data-testid="proposal-notes-input"
            disabled={isPending}
          />
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs ${notes.length > 8000 ? "text-destructive" : "text-muted-foreground"}`}
              data-testid="proposal-notes-char-count"
            >
              {notes.length.toLocaleString()} / 8,000 characters
            </span>
            <Button
              size="sm"
              onClick={() => {
                setDraftResult(null);
                draft();
              }}
              disabled={!canDraft}
              data-testid="proposal-draft-button"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Drafting…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Draft SOW
                </>
              )}
            </Button>
          </div>

          {fieldError ? (
            <div
              className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2"
              data-testid="proposal-field-error"
            >
              <AlertCircle className="size-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{fieldError}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Draft result */}
      {isPending ? (
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          data-testid="proposal-drafting"
        >
          <Loader2 className="size-4 animate-spin" />
          AI is drafting your SOW — this usually takes a few seconds…
        </div>
      ) : draftResult ? (
        <DraftResultPanel draft={draftResult} pdfUrl={pdfUrl} />
      ) : null}
    </section>
  );
}
