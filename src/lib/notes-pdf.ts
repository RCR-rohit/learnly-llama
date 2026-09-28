export async function downloadNotesPdf(title: string, markdown: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 56;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const pageH = doc.internal.pageSize.getHeight();
  let y = margin;

  const write = (text: string, size: number, style: "normal" | "bold", gap = 6, indent = 0) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, width - indent) as string[];
    for (const line of lines) {
      if (y + size > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin + indent, y + size);
      y += size * 1.35;
    }
    y += gap;
  };

  const clean = (s: string) =>
    s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/[*_`]/g, "").replace(/\[(.+?)\]\(.+?\)/g, "$1");

  write(title, 22, "bold", 12);
  for (const raw of markdown.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      y += 4;
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)/);
    const li = line.match(/^\s*(?:[-*+]|\d+\.)\s+(.*)/);
    if (h) {
      const level = (h[1] ?? "").length;
      write(clean(h[2] ?? ""), level <= 1 ? 18 : level === 2 ? 15 : 13, "bold", 4);
    } else if (li) write("•  " + clean(li[1] ?? ""), 11, "normal", 2, 10);
    else write(clean(line), 11, "normal", 4);
  }

  const safe = title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "notes";
  doc.save(`${safe}-notes.pdf`);
}
