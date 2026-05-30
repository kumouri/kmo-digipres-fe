import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, FileText, Send, XCircle } from "lucide-react";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../primitives/card";
import { useContractsApi } from "../../hooks/useContractsApi";
import type { ContractStatus } from "../../types/api";

const STATUS_VARIANT: Record<string, "default" | "muted" | "outline"> = {
  DRAFT: "muted",
  SENT: "default",
  SIGNED: "default",
  VOIDED: "outline",
};

/** Which terminal/external statuses are immutable in the UI. */
const IMMUTABLE_STATUSES = new Set<ContractStatus>(["SIGNED", "VOIDED"]);

export function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const contractsApi = useContractsApi();

  const { data: contract, isLoading } = useQuery({
    queryKey: ["contracts", id],
    queryFn: () => contractsApi.getContract(id!),
    enabled: !!id,
  });

  const sendMutation = useMutation({
    mutationFn: () => contractsApi.sendContract(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts", id] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contract sent via Documenso.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Send failed.");
    },
  });

  const voidMutation = useMutation({
    mutationFn: () => contractsApi.setContractStatus(id!, "VOIDED"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts", id] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contract voided.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Void failed.");
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!contract) return <p className="text-muted-foreground">Contract not found.</p>;

  const status = (contract.status ?? "DRAFT") as ContractStatus;
  const isImmutable = IMMUTABLE_STATUSES.has(status);
  const canSend = status === "DRAFT";
  const canVoid = status === "DRAFT" || status === "SENT";
  const isSigned = status === "SIGNED";

  return (
    <section className="flex flex-col gap-4" data-testid="contract-detail">
      <header className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/contracts")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-medium">
          {contract.contractNumber
            ? `Contract ${contract.contractNumber}`
            : (contract.title ?? contract.id?.slice(0, 8) ?? "Contract")}
        </h1>
        <Badge variant={STATUS_VARIANT[status] ?? "muted"}>{status}</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {contract.title && (
            <div>
              <span className="text-muted-foreground">Title:</span> {contract.title}
            </div>
          )}
          {contract.contractNumber && (
            <div>
              <span className="text-muted-foreground">Contract #:</span>{" "}
              {contract.contractNumber}
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Kind:</span>{" "}
            <Badge variant="outline">{contract.kind ?? "—"}</Badge>
          </div>
          {contract.dealId && (
            <div>
              <span className="text-muted-foreground">Deal:</span> {contract.dealId}
            </div>
          )}
          {contract.quoteId && (
            <div>
              <span className="text-muted-foreground">Quote:</span> {contract.quoteId}
            </div>
          )}
          {contract.contactId && (
            <div>
              <span className="text-muted-foreground">Contact:</span> {contract.contactId}
            </div>
          )}
          {contract.companyId && (
            <div>
              <span className="text-muted-foreground">Company:</span> {contract.companyId}
            </div>
          )}
          {contract.sentAt && (
            <div>
              <span className="text-muted-foreground">Sent at:</span> {contract.sentAt}
            </div>
          )}
          {isSigned && contract.signedAt && (
            <div>
              <span className="text-muted-foreground">Signed at:</span>{" "}
              <span data-testid="contract-signed-at">{contract.signedAt}</span>
            </div>
          )}
          {contract.voidReason && (
            <div>
              <span className="text-muted-foreground">Void reason:</span>{" "}
              {contract.voidReason}
            </div>
          )}
        </CardContent>
      </Card>

      {isSigned && (
        <Card>
          <CardHeader>
            <CardTitle>Signed</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This contract has been signed via Documenso and is now immutable. Download
            the signed PDF below.
          </CardContent>
        </Card>
      )}

      {!isImmutable && (
        <div className="flex gap-2 flex-wrap">
          {canSend && (
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
              data-testid="contract-send-btn"
            >
              <Send className="size-4" /> Send for signature
            </Button>
          )}
          {canVoid && (
            <Button
              variant="outline"
              onClick={() => voidMutation.mutate()}
              disabled={voidMutation.isPending}
              data-testid="contract-void-btn"
            >
              <XCircle className="size-4" /> Void
            </Button>
          )}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" asChild data-testid="contract-pdf-link">
          <a
            href={contractsApi.getContractPdfUrl(id!)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FileText className="size-4" /> View PDF
          </a>
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" asChild>
          <Link to="/contracts">All contracts</Link>
        </Button>
      </div>
    </section>
  );
}
