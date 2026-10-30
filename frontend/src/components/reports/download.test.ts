import { downloadBlob, exportFileName } from '@/components/reports/download'

describe('exportFileName', () => {
  it('matches the name the server puts in Content-Disposition', () => {
    expect(exportFileName('2026-10-24', '2026-10-30')).toBe('MOS-sales-2026-10-24-to-2026-10-30.xlsx')
  })
})

describe('downloadBlob', () => {
  afterEach(() => {
    Reflect.deleteProperty(URL, 'createObjectURL')
    Reflect.deleteProperty(URL, 'revokeObjectURL')
    vi.restoreAllMocks()
  })

  it('clicks an attached link carrying the file name, then frees the blob URL', () => {
    // jsdom has no object URLs of its own.
    const revoked: string[] = []
    Object.assign(URL, {
      createObjectURL: () => 'blob:mos-test',
      revokeObjectURL: (url: string) => revoked.push(url)
    })
    const clicked: { href: string | null; download: string; attached: boolean }[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ href: this.getAttribute('href'), download: this.download, attached: this.isConnected })
    })

    downloadBlob(new Blob(['sheet']), 'MOS-sales-2026-10-24-to-2026-10-30.xlsx')

    expect(clicked).toEqual([
      { href: 'blob:mos-test', download: 'MOS-sales-2026-10-24-to-2026-10-30.xlsx', attached: true }
    ])
    expect(revoked).toEqual(['blob:mos-test'])
    expect(document.querySelector('a[download]')).toBeNull()
  })
})
