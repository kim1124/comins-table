type ExportFormat = "csv" | "xlsx" | "json";

/** Original decorative glyphs; accessible names remain on their controls. */
export function ExportFormatIcon({ format }: { format: ExportFormat }) {
  return <svg className={`export-format-icon export-format-icon--${format}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {format === "xlsx" ? <>
      <rect x="2.5" y="3" width="19" height="18" rx="3" fill="currentColor" fillOpacity=".08" />
      <path d="M12 3v18M12 9h9M12 15h9M17 3v18M5.5 8l4 8m0-8-4 8" />
    </> : format === "csv" ? <>
      <rect x="2.5" y="3" width="19" height="18" rx="3" fill="currentColor" fillOpacity=".08" />
      <path d="M9 8H6v4h3c0 2-1 3-3 4m11-8h-3v4h3c0 2-1 3-3 4" />
    </> : <path d="M9 4H7v5l-3 3 3 3v5h2m6-16h2v5l3 3-3 3v5h-2" />}
  </svg>;
}
