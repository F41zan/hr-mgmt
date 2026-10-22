/**
 * lib/pdf.ts
 * Tiny dependency-free PDF writer (single A4 page, Helvetica, text + boxes).
 * Enough for payslips and simple printable reports.
 *
 * Coordinates are in points from the TOP-LEFT corner (converted internally,
 * since PDF's origin is bottom-left).
 */

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;

type RGB = [number, number, number];

export interface TextOptions {
  size?: number;
  bold?: boolean;
  color?: RGB;
  align?: "left" | "right" | "center";
}

/** Keep printable ASCII only — the built-in Helvetica uses WinAnsi encoding. */
function sanitize(text: string): string {
  return text
    .replace(/₹/g, "Rs.")
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/** Rough Helvetica width estimate (average glyph ≈ 0.5em, bold ≈ 0.55em). */
export function estimateTextWidth(text: string, size: number, bold = false) {
  return text.length * size * (bold ? 0.55 : 0.5);
}

const n = (v: number) => (Math.round(v * 100) / 100).toString();
const rgb = ([r, g, b]: RGB) => `${n(r / 255)} ${n(g / 255)} ${n(b / 255)}`;

export class SimplePdf {
  private ops: string[] = [];
  readonly width = PAGE_WIDTH;
  readonly height = PAGE_HEIGHT;

  text(x: number, y: number, value: string, opts: TextOptions = {}) {
    const size = opts.size ?? 10;
    const font = opts.bold ? "F2" : "F1";
    let drawX = x;
    if (opts.align === "right")
      drawX = x - estimateTextWidth(value, size, opts.bold);
    else if (opts.align === "center")
      drawX = x - estimateTextWidth(value, size, opts.bold) / 2;

    this.ops.push(
      `BT ${rgb(opts.color ?? [15, 23, 42])} rg /${font} ${n(size)} Tf ` +
        `${n(drawX)} ${n(PAGE_HEIGHT - y)} Td (${sanitize(value)}) Tj ET`,
    );
    return this;
  }

  rect(
    x: number,
    y: number,
    w: number,
    h: number,
    opts: { fill?: RGB; stroke?: RGB; lineWidth?: number } = {},
  ) {
    const parts: string[] = ["q"];
    if (opts.fill) parts.push(`${rgb(opts.fill)} rg`);
    if (opts.stroke)
      parts.push(`${rgb(opts.stroke)} RG ${n(opts.lineWidth ?? 0.75)} w`);
    parts.push(`${n(x)} ${n(PAGE_HEIGHT - y - h)} ${n(w)} ${n(h)} re`);
    parts.push(opts.fill && opts.stroke ? "B" : opts.fill ? "f" : "S");
    parts.push("Q");
    this.ops.push(parts.join(" "));
    return this;
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB = [203, 213, 225]) {
    this.ops.push(
      `q ${rgb(color)} RG 0.75 w ${n(x1)} ${n(PAGE_HEIGHT - y1)} m ` +
        `${n(x2)} ${n(PAGE_HEIGHT - y2)} l S Q`,
    );
    return this;
  }

  /** Serialize to a PDF byte buffer. */
  toBuffer(): Buffer {
    const content = this.ops.join("\n");
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(PAGE_WIDTH)} ${n(PAGE_HEIGHT)}] ` +
        "/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
      `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    ];

    let out = "%PDF-1.4\n";
    const offsets: number[] = [];
    objects.forEach((obj, i) => {
      offsets.push(Buffer.byteLength(out, "latin1"));
      out += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    });

    const xrefStart = Buffer.byteLength(out, "latin1");
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) out += `${off.toString().padStart(10, "0")} 00000 n \n`;
    out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

    return Buffer.from(out, "latin1");
  }
}
