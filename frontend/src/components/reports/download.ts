/** FR-29: the export comes back as a Blob (api.ts), so the browser has to save it itself. */

/** The file name AdminReportController sends in Content-Disposition. */
export function exportFileName(from: string, to: string): string {
  return `MOS-sales-${from}-to-${to}.xlsx`
}

/** Hands the blob to the browser's download, then lets it go. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
