import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  FileText,
  Pencil,
  Plus,
  ThumbsDown,
  ThumbsUp,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../../primitives/badge";
import { Button } from "../../primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../primitives/card";
import { Input } from "../../primitives/input";
import { Label } from "../../primitives/label";
import { Textarea } from "../../primitives/textarea";
import { useTechCopilotApi } from "../../hooks/useTechCopilotApi";
import type {
  AskResponse,
  TechDoc,
  TechQuery,
} from "../../api/tech-copilot";
import { EQUIPMENT_TYPE_LABELS, labelFor } from "../labels";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const TECH_COPILOT_DOCS_KEY = ["techcopilot", "docs"] as const;
export const TECH_COPILOT_QUERIES_KEY = ["techcopilot", "queries"] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EQUIPMENT_TYPES = [
  "FURNACE",
  "AC",
  "HEAT_PUMP",
  "BOILER",
  "WATER_HEATER",
  "THERMOSTAT",
  "DUCTLESS_MINI_SPLIT",
  "REFRIGERATION",
  "GENERAL",
] as const;

function scoreColor(score: number): string {
  if (score >= 0.75) return "text-green-600 dark:text-green-400";
  if (score >= 0.5) return "text-yellow-600 dark:text-yellow-400";
  return "text-muted-foreground";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

// ---------------------------------------------------------------------------
// Ask form schema
// ---------------------------------------------------------------------------

const askSchema = z.object({
  question: z.string().min(1, "Enter a question."),
  equipmentType: z.string().optional(),
});
type AskFormValues = z.infer<typeof askSchema>;

// ---------------------------------------------------------------------------
// Doc form schema
// ---------------------------------------------------------------------------

const docSchema = z.object({
  title: z.string().min(1, "Title is required."),
  equipmentType: z.string().optional(),
  source: z.string().optional(),
  text: z.string().min(1, "Document text is required."),
});
type DocFormValues = z.infer<typeof docSchema>;

// ---------------------------------------------------------------------------
// Citation chip
// ---------------------------------------------------------------------------

function CitationChip({ citation }: { citation: AskResponse["citations"][0] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="rounded-md border bg-muted/40 p-3 text-sm"
      data-testid="citation-chip"
    >
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 text-left"
        onClick={() => setExpanded((v) => !v)}
        data-testid="citation-chip-toggle"
      >
        <div className="flex flex-wrap items-center gap-2">
          <BookOpen className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <span
            className="font-medium leading-tight"
            data-testid="citation-doc-title"
          >
            {citation.techDocTitle}
          </span>
          <Badge variant="outline" className="text-xs" data-testid="citation-equipment-type">
            {labelFor(EQUIPMENT_TYPE_LABELS, citation.equipmentType)}
          </Badge>
          <span
            className={`text-xs tabular-nums ${scoreColor(citation.score)}`}
            data-testid="citation-score"
          >
            {(citation.score * 100).toFixed(0)}% match
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {expanded && citation.contentPreview && (
        <p
          className="mt-2 border-t pt-2 text-xs text-muted-foreground"
          data-testid="citation-preview"
        >
          {citation.contentPreview}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ask panel — the Q&A surface
// ---------------------------------------------------------------------------

function AskPanel() {
  const api = useTechCopilotApi();
  const queryClient = useQueryClient();
  const [lastAnswer, setLastAnswer] = useState<AskResponse | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AskFormValues>({
    resolver: zodResolver(askSchema),
    defaultValues: { question: "", equipmentType: "" },
  });

  const askMutation = useMutation({
    mutationFn: ({ question, equipmentType }: AskFormValues) =>
      api.ask(question, equipmentType || null),
    onSuccess: (data) => {
      setLastAnswer(data);
      setFeedbackSent(null);
      reset({ question: "", equipmentType: "" });
      // Invalidate query history so it refreshes after an ask
      void queryClient.invalidateQueries({ queryKey: TECH_COPILOT_QUERIES_KEY });
    },
    onError: () => {
      toast.error("Something went wrong — please try again.");
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ helpful }: { helpful: boolean }) =>
      api.submitFeedback(lastAnswer!.queryId, helpful),
    onSuccess: (_data, vars) => {
      setFeedbackSent(vars.helpful);
      void queryClient.invalidateQueries({ queryKey: TECH_COPILOT_QUERIES_KEY });
      toast.success(vars.helpful ? "Thanks — glad that helped!" : "Got it — we'll use that to improve.");
    },
    onError: () => {
      toast.error("Feedback couldn't be saved — please try again.");
    },
  });

  const onSubmit = (values: AskFormValues) => {
    setLastAnswer(null);
    setFeedbackSent(null);
    askMutation.mutate(values);
  };

  return (
    <section
      className="flex flex-col gap-6"
      data-testid="tech-copilot-ask-panel"
    >
      {/* Ask form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CircleHelp className="size-4 text-muted-foreground" />
            Ask the field-tech copilot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-3"
            data-testid="tech-copilot-ask-form"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tc-question">Your question</Label>
              <Textarea
                id="tc-question"
                placeholder="e.g. What is the ignition sequence for the Carrier 58STA furnace?"
                rows={3}
                {...register("question")}
                data-testid="tc-question-input"
              />
              {errors.question && (
                <p className="text-xs text-destructive">{errors.question.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tc-equipment-type">Equipment type (optional)</Label>
              <select
                id="tc-equipment-type"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register("equipmentType")}
                data-testid="tc-equipment-type-select"
              >
                <option value="">Any equipment</option>
                {EQUIPMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {labelFor(EQUIPMENT_TYPE_LABELS, t)}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              disabled={askMutation.isPending}
              data-testid="tc-ask-btn"
            >
              {askMutation.isPending ? "Looking it up…" : "Ask"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Answer card */}
      {lastAnswer && (
        <Card data-testid="tc-answer-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {lastAnswer.handoff ? (
                <>
                  <AlertTriangle className="size-4 text-yellow-500" />
                  Not in your manuals
                </>
              ) : (
                <>
                  <Check className="size-4 text-green-600 dark:text-green-400" />
                  Answer from your manuals
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Handoff state */}
            {lastAnswer.handoff && (
              <div
                className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-foreground"
                data-testid="tc-handoff-banner"
              >
                <p className="font-medium">This isn&apos;t documented yet.</p>
                <p className="mt-1 text-muted-foreground">
                  {lastAnswer.answer ||
                    "The answer to this question isn’t in your current manual library. Add the relevant manual below to enable grounded answers."}
                </p>
              </div>
            )}

            {/* Grounded answer */}
            {!lastAnswer.handoff && (
              <p
                className="whitespace-pre-wrap text-sm text-foreground"
                data-testid="tc-answer-text"
              >
                {lastAnswer.answer}
              </p>
            )}

            {/* Citations */}
            {lastAnswer.citations.length > 0 && (
              <div className="flex flex-col gap-2" data-testid="tc-citations-list">
                <p className="text-xs font-medium text-muted-foreground">
                  Sources
                </p>
                {lastAnswer.citations.map((c) => (
                  <CitationChip key={c.techDocId} citation={c} />
                ))}
              </div>
            )}

            {/* Feedback buttons */}
            {feedbackSent === null ? (
              <div
                className="flex items-center gap-2 border-t pt-3"
                data-testid="tc-feedback-row"
              >
                <span className="text-xs text-muted-foreground">
                  Was this helpful?
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={feedbackMutation.isPending}
                  onClick={() => feedbackMutation.mutate({ helpful: true })}
                  data-testid="tc-feedback-thumbs-up"
                >
                  <ThumbsUp className="size-4" />
                  Yes
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={feedbackMutation.isPending}
                  onClick={() => feedbackMutation.mutate({ helpful: false })}
                  data-testid="tc-feedback-thumbs-down"
                >
                  <ThumbsDown className="size-4" />
                  No
                </Button>
              </div>
            ) : (
              <div
                className="flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground"
                data-testid="tc-feedback-sent"
              >
                <Check className="size-3.5" />
                {feedbackSent ? "Marked as helpful" : "Marked as not helpful"}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Doc form (add / edit)
// ---------------------------------------------------------------------------

function DocForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: TechDoc;
  onSave: (values: DocFormValues) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<DocFormValues>({
    resolver: zodResolver(docSchema),
    defaultValues: {
      title: initial?.title ?? "",
      equipmentType: initial?.equipmentType ?? "GENERAL",
      source: initial?.source ?? "",
      text: initial?.text ?? "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSave)}
      className="flex flex-col gap-3"
      data-testid="tc-doc-form"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="doc-title">Title</Label>
        <Input
          id="doc-title"
          placeholder="e.g. Carrier 58STA Furnace — Service Manual"
          {...register("title")}
          data-testid="tc-doc-title-input"
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="doc-equipment-type">Equipment type</Label>
        <select
          id="doc-equipment-type"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          {...register("equipmentType")}
          data-testid="tc-doc-equipment-type-select"
        >
          {EQUIPMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {labelFor(EQUIPMENT_TYPE_LABELS, t)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="doc-source">Source / provenance (optional)</Label>
        <Input
          id="doc-source"
          placeholder="e.g. Carrier manufacturer doc Rev-G, 2024"
          {...register("source")}
          data-testid="tc-doc-source-input"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="doc-text">Document text</Label>
        <Textarea
          id="doc-text"
          placeholder="Paste the full manual or SOP text here…"
          rows={6}
          {...register("text")}
          data-testid="tc-doc-text-input"
        />
        {errors.text && (
          <p className="text-xs text-destructive">{errors.text.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={!isDirty && !!initial}
          data-testid="tc-doc-save-btn"
        >
          {initial ? "Save changes" : "Add manual"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          data-testid="tc-doc-cancel-btn"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Docs manager panel
// ---------------------------------------------------------------------------

function DocsManagerPanel() {
  const api = useTechCopilotApi();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<TechDoc[]>({
    queryKey: TECH_COPILOT_DOCS_KEY,
    queryFn: () => api.listDocs(),
  });

  const createMutation = useMutation({
    mutationFn: (values: DocFormValues) =>
      api.createDoc({
        title: values.title,
        equipmentType: values.equipmentType || "GENERAL",
        source: values.source || null,
        text: values.text,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TECH_COPILOT_DOCS_KEY });
      setAddOpen(false);
      toast.success("Manual added — it'll be searchable shortly.");
    },
    onError: () => {
      toast.error("Couldn't add the manual — please try again.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: DocFormValues;
    }) =>
      api.updateDoc(id, {
        title: values.title,
        equipmentType: values.equipmentType || "GENERAL",
        source: values.source || null,
        text: values.text,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TECH_COPILOT_DOCS_KEY });
      setEditingId(null);
      toast.success("Manual updated — re-indexing now.");
    },
    onError: () => {
      toast.error("Couldn't save the changes — please try again.");
    },
  });

  return (
    <section
      className="flex flex-col gap-4"
      data-testid="tc-docs-manager"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-medium">
            <FileText className="size-4 text-muted-foreground" />
            Manual library
          </h2>
          <p className="text-xs text-muted-foreground">
            The docs your team can ask questions about. Add a manual or SOP to
            expand what the copilot can answer.
          </p>
        </div>
        {!addOpen && (
          <Button
            size="sm"
            onClick={() => {
              setEditingId(null);
              setAddOpen(true);
            }}
            data-testid="tc-add-doc-btn"
          >
            <Plus className="size-4" />
            Add manual
          </Button>
        )}
      </div>

      {/* Add form */}
      {addOpen && (
        <Card data-testid="tc-add-doc-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New manual</CardTitle>
          </CardHeader>
          <CardContent>
            <DocForm
              onSave={(values) => createMutation.mutate(values)}
              onCancel={() => setAddOpen(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Doc list */}
      {isLoading ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid="tc-docs-loading"
        >
          Loading manuals…
        </p>
      ) : isError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="tc-docs-error"
        >
          <p className="text-sm text-foreground">
            We couldn&apos;t load the manual library.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-8 text-center"
          data-testid="tc-docs-empty"
        >
          <BookOpen className="mx-auto mb-2 size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No manuals yet — add one above to get started.
          </p>
        </div>
      ) : (
        <div
          className="flex flex-col gap-3"
          data-testid="tc-docs-list"
        >
          {data.map((doc) => (
            <Card key={doc.id} data-testid="tc-doc-card" data-doc-id={doc.id}>
              {editingId === doc.id ? (
                <>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Edit manual
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DocForm
                      initial={doc}
                      onSave={(values) =>
                        updateMutation.mutate({ id: doc.id, values })
                      }
                      onCancel={() => setEditingId(null)}
                    />
                  </CardContent>
                </>
              ) : (
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <CardTitle
                        className="flex items-center gap-2 text-base"
                        data-testid="tc-doc-title"
                      >
                        <Wrench className="size-4 text-muted-foreground" />
                        {doc.title}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs"
                          data-testid="tc-doc-equipment-type"
                        >
                          {labelFor(EQUIPMENT_TYPE_LABELS, doc.equipmentType)}
                        </Badge>
                        {doc.indexedAt ? (
                          <span className="text-xs text-green-600 dark:text-green-400" data-testid="tc-doc-indexed">
                            Indexed
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground" data-testid="tc-doc-not-indexed">
                            Pending index
                          </span>
                        )}
                        {doc.source && (
                          <span
                            className="text-xs text-muted-foreground"
                            data-testid="tc-doc-source"
                          >
                            {doc.source}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAddOpen(false);
                        setEditingId(doc.id);
                      }}
                      data-testid="tc-doc-edit-btn"
                    >
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
              )}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Query history panel
// ---------------------------------------------------------------------------

function QueryHistoryPanel() {
  const api = useTechCopilotApi();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<TechQuery[]>({
    queryKey: TECH_COPILOT_QUERIES_KEY,
    queryFn: () => api.listQueries(),
  });

  const feedbackMutation = useMutation({
    mutationFn: ({
      queryId,
      helpful,
    }: {
      queryId: string;
      helpful: boolean;
    }) => api.submitFeedback(queryId, helpful),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TECH_COPILOT_QUERIES_KEY });
    },
    onError: () => {
      toast.error("Feedback couldn't be saved — please try again.");
    },
  });

  return (
    <section
      className="flex flex-col gap-4"
      data-testid="tc-query-history"
    >
      <div className="flex flex-col gap-0.5">
        <h2 className="flex items-center gap-2 text-base font-medium">
          <CircleHelp className="size-4 text-muted-foreground" />
          Recent questions
        </h2>
        <p className="text-xs text-muted-foreground">
          Questions your team has asked, with their grounded answers.
          Rate answers to help improve the corpus.
        </p>
      </div>

      {isLoading ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid="tc-queries-loading"
        >
          Loading history…
        </p>
      ) : isError ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-4"
          data-testid="tc-queries-error"
        >
          <p className="text-sm text-foreground">
            We couldn&apos;t load the question history.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-8 text-center"
          data-testid="tc-queries-empty"
        >
          <CircleHelp className="mx-auto mb-2 size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No questions yet — ask the first one above.
          </p>
        </div>
      ) : (
        <div
          className="flex flex-col gap-3"
          data-testid="tc-queries-list"
        >
          {data.map((q) => (
            <Card
              key={q.id}
              data-testid="tc-query-card"
              data-query-id={q.id}
              data-handoff={String(q.handoff)}
            >
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-sm font-medium" data-testid="tc-query-question">
                    {q.question}
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    {q.handoff ? (
                      <Badge variant="outline" className="text-xs text-yellow-600 dark:text-yellow-400" data-testid="tc-query-handoff-badge">
                        Not documented
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs" data-testid="tc-query-grounded-badge">
                        Grounded
                      </Badge>
                    )}
                    {q.equipmentTypeHint && (
                      <Badge variant="outline" className="text-xs">
                        {labelFor(EQUIPMENT_TYPE_LABELS, q.equipmentTypeHint)}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(q.createdAt)}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {q.answer && (
                  <p
                    className="whitespace-pre-wrap text-sm text-foreground"
                    data-testid="tc-query-answer"
                  >
                    {q.answer}
                  </p>
                )}
                {q.citations.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {q.citations.map((c, i) => (
                      <span
                        key={`${c.techDocId}-${i}`}
                        className="text-xs text-muted-foreground"
                        data-testid="tc-query-citation-ref"
                      >
                        From: {c.techDocTitle}
                      </span>
                    ))}
                  </div>
                )}

                {/* Feedback */}
                {q.helpful === null ? (
                  <div
                    className="flex items-center gap-2 border-t pt-2"
                    data-testid="tc-query-feedback-row"
                  >
                    <span className="text-xs text-muted-foreground">
                      Was this helpful?
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={feedbackMutation.isPending}
                      onClick={() =>
                        feedbackMutation.mutate({ queryId: q.id, helpful: true })
                      }
                      data-testid="tc-query-thumbs-up"
                    >
                      <ThumbsUp className="size-3.5" />
                      Yes
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={feedbackMutation.isPending}
                      onClick={() =>
                        feedbackMutation.mutate({ queryId: q.id, helpful: false })
                      }
                      data-testid="tc-query-thumbs-down"
                    >
                      <ThumbsDown className="size-3.5" />
                      No
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-1.5 border-t pt-2 text-xs text-muted-foreground"
                    data-testid="tc-query-feedback-sent"
                  >
                    {q.helpful ? (
                      <>
                        <ThumbsUp className="size-3.5 text-green-600 dark:text-green-400" />
                        Marked helpful
                      </>
                    ) : (
                      <>
                        <ThumbsDown className="size-3.5" />
                        Marked not helpful
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main TechCopilotPanel — the top-level surface
// ---------------------------------------------------------------------------

/**
 * Home Services T13 "Tech Copilot" — the field-tech grounded Q&A console:
 *
 * 1. Ask panel: natural-language question → grounded cited answer (with
 *    citation chips: doc title + equipment type + preview + score), or a
 *    clear "not in your docs" handoff state when handoff=true.
 *    Thumbs-up / thumbs-down feedback after each answer.
 *
 * 2. Manual library: list + add/edit TechDocs (title, equipment type, source,
 *    full text for chunking + embedding on save).
 *
 * 3. Recent questions: query history with thumbs feedback per item.
 *
 * Rendered behind RequireNotContractor grouped with the other Home Services
 * surfaces (the T11 QuoteCloserSettings / T8 PriceBookConfig precedent).
 */
export function TechCopilotPanel() {
  const [tab, setTab] = useState<"ask" | "docs" | "history">("ask");

  return (
    <section
      className="flex flex-col gap-8"
      data-testid="tech-copilot-panel"
    >
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-medium">
          <Wrench className="size-6 text-muted-foreground" />
          Tech copilot
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Ask a question — the copilot searches your manual library and returns
          a cited answer. If the answer isn&apos;t documented yet, it tells you
          so honestly and tells you what to add.
        </p>
      </header>

      {/* Tab bar */}
      <div
        className="flex flex-wrap gap-2 border-b pb-0"
        data-testid="tc-tab-bar"
      >
        {(
          [
            { key: "ask", label: "Ask a question" },
            { key: "docs", label: "Manual library" },
            { key: "history", label: "Recent questions" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            data-testid={`tc-tab-${key}`}
            className={`-mb-px rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? "border border-b-background bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex flex-col gap-6">
        {tab === "ask" && <AskPanel />}
        {tab === "docs" && <DocsManagerPanel />}
        {tab === "history" && <QueryHistoryPanel />}
      </div>
    </section>
  );
}
