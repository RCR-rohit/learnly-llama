import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileUp, Loader2, Sparkle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { generatePdfStudyKit } from "@/lib/study.functions";
import { createTopic, newId, updateTopic } from "@/lib/study-store";

const MAX_MB = 10;

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function PdfStudyKit() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  function pick(f: File | undefined) {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please choose a PDF file.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`That PDF is too big. Please use one under ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
  }

  async function build() {
    if (!file || busy) return;
    setBusy(true);
    try {
      const base64 = await toBase64(file);
      const kit = await generatePdfStudyKit({ data: { fileName: file.name, base64 } });
      const topic = createTopic(kit.title || file.name.replace(/\.pdf$/i, ""));
      updateTopic(topic.id, {
        notes: kit.notes,
        summary: kit.summary,
        viva: kit.viva,
        sourceText: kit.keyContent,
        sourceName: file.name,
        mcqs: kit.questions,
        flashcards: kit.cards.map((c) => ({ ...c, id: newId(), known: false })),
      });
      setFile(null);
      navigate({ to: "/topic/$topicId", params: { topicId: topic.id } });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Couldn't read that PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cyber-panel mx-auto mt-6 max-w-3xl p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="section-label">PDF → complete study kit</p>
          <h2 className="mt-1 text-xl">Upload a textbook or lecture PDF</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          Notes · Summary · Quiz · Flashcards · Viva · Ask
        </span>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files[0]);
        }}
        disabled={busy}
        className={`mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-8 text-sm transition-colors ${
          drag ? "border-primary bg-primary/10" : "border-border bg-secondary/30 hover:border-primary/50"
        }`}
      >
        <FileUp className="size-6 text-primary" />
        {file ? (
          <span className="font-medium">{file.name}</span>
        ) : (
          <span className="text-muted-foreground">Drop a PDF here or click to choose (max {MAX_MB} MB)</span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {busy ? "Reading your PDF — this can take up to a minute…" : "Everything is built from your PDF only."}
        </span>
        <Button onClick={build} disabled={!file || busy} className="gap-2">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkle className="size-4" />}
          {busy ? "Building kit…" : "Build study kit"}
        </Button>
      </div>
    </section>
  );
}
