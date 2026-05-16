import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, FileText } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../primitives/card";
import { useQuotesApi } from "../../hooks/useQuotesApi";
import type { QuoteStatus } from "../../types/api";

const VALID_TRANSITIONS: Record<string, QuoteStatus[]> = {
  DRAFT: ["SENT"],
  SENT: ["ACCEPTED", "DECLINED"],
  ACCEPTED: [],
  DECLINED: [],
  EXPIRED: [],
};

export function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const quotesApi = useQuotesApi();

  const { data: quote, isLoading } = useQuery({
    queryKey: ["quotes", id],
    queryFn: () => quotesApi.getQuote(id!),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (target: string) => quotesApi.changeQuoteStatus(id!, target),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes", id] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote status updated.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Status change failed.");
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!quote) return <p className="text-muted-foreground">Quote not found.</p>;

  const transitions = VALID_TRANSITIONS[quote.status ?? "DRAFT"] ?? [];

  return (
    <section className="flex flex-col gap-4" data-testid="quote-detail">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/quotes")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-medium">
          Quote {quote.quoteNumber ?? quote.id?.slice(0, 8)}
        </h1>
        <Badge variant="muted">{quote.status ?? "DRAFT"}</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Currency:</span>{" "}
            {quote.currency ?? "USD"}
          </div>
          <div>
            <span className="text-muted-foreground">Total:</span>{" "}
            {quote.currency ?? "USD"} {quote.total?.toFixed(2) ?? "0.00"}
          </div>
          {quote.expiresAt && (
            <div>
              <span className="text-muted-foreground">Expires:</span>{" "}
              {quote.expiresAt}
            </div>
          )}
          {quote.notes && (
            <div>
              <span className="text-muted-foreground">Notes:</span> {quote.notes}
            </div>
          )}
        </CardContent>
      </Card>

      {(quote.lineItems ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm" data-testid="quote-line-items">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1">Description</th>
                  <th className="py-1 text-right">Qty</th>
                  <th className="py-1 text-right">Unit Price</th>
                  <th className="py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(quote.lineItems ?? []).map((li, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-1">{li.description ?? li.sku ?? "—"}</td>
                    <td className="py-1 text-right">{li.quantity ?? 1}</td>
                    <td className="py-1 text-right">
                      {li.unitPrice?.toFixed(2) ?? "0.00"}
                    </td>
                    <td className="py-1 text-right">
                      {li.lineTotal?.toFixed(2) ?? "0.00"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        {transitions.map((target) => (
          <Button
            key={target}
            variant="outline"
            onClick={() => statusMutation.mutate(target)}
            disabled={statusMutation.isPending}
            data-testid={`quote-status-${target.toLowerCase()}`}
          >
            Mark {target}
          </Button>
        ))}

        <Button
          variant="outline"
          asChild
          data-testid="quote-pdf-link"
        >
          <a
            href={`/api/v1/quotes/${id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileText className="size-4" /> Download PDF
          </a>
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" asChild>
          <Link to="/quotes">All quotes</Link>
        </Button>
      </div>
    </section>
  );
}
