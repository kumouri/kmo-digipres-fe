import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";

import { Button } from "../../primitives/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../primitives/dialog";
import { useAiApi } from "../../hooks/useAiApi";
import type { AskResult } from "../../types/api";

export function AskAiDialog() {
  const aiApi = useAiApi();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);

  const askMutation = useMutation({
    mutationFn: () => aiApi.askAi({ question }),
    onSuccess: (data) => {
      setResult(data);
    },
  });

  function handleOpen() {
    setOpen(true);
    setResult(null);
    setQuestion("");
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        data-testid="ask-ai-btn"
      >
        <Sparkles className="size-4" /> Ask AI
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="ask-ai-dialog">
          <DialogHeader>
            <DialogTitle>Ask AI</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">
              Question
              <textarea
                className="mt-1 block w-full rounded border px-2 py-1 text-sm resize-none"
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask anything about your CRM data…"
                data-testid="ask-ai-input"
              />
            </label>
            <Button
              disabled={!question.trim() || askMutation.isPending}
              onClick={() => askMutation.mutate()}
              data-testid="ask-ai-submit"
            >
              {askMutation.isPending ? "Thinking…" : "Ask"}
            </Button>

            {result && (
              <div className="rounded border bg-muted/40 p-3" data-testid="ask-ai-answer">
                <p className="text-sm whitespace-pre-wrap">{result.answer}</p>
                {(result.citations ?? []).length > 0 && (
                  <ul className="mt-2 text-xs text-muted-foreground list-disc pl-4">
                    {(result.citations ?? []).map((c, i) => (
                      <li key={i}>{c.contentPreview ?? JSON.stringify(c)}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
