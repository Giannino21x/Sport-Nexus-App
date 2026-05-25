// One-off: convert docs/*.md → pdfs/*.pdf using Playwright (no extra deps).
// Usage: node scripts/md-to-pdf.mjs

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const DOCS = [
  { src: 'docs/HUBSPOT-SYNC.md',     out: 'pdfs/SportNexus_HubSpot-Sync_Konzept.pdf',     title: 'HubSpot → SportNexus Member-Sync (Konzept)' },
  { src: 'docs/AI-TISCHZUWEISUNG.md', out: 'pdfs/SportNexus_AI-Tischzuweisung_Konzept.pdf', title: 'AI-gestützte Tischzuweisung (Konzept)' },
]

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function inline(s) {
  // inline code first so its content is preserved
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${escapeHtml(c)}</code>`)
  // bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // italics (single *) – conservative: not next to spaces
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
  // links
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  return s
}

function renderTable(rows) {
  // rows: array of raw "| a | b |" lines (header, separator, body...)
  const cells = (line) =>
    line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
  const header = cells(rows[0])
  const body = rows.slice(2).map(cells)
  let html = '<table><thead><tr>'
  for (const h of header) html += `<th>${inline(escapeHtml(h))}</th>`
  html += '</tr></thead><tbody>'
  for (const r of body) {
    html += '<tr>'
    for (const c of r) html += `<td>${inline(escapeHtml(c))}</td>`
    html += '</tr>'
  }
  html += '</tbody></table>'
  return html
}

function mdToHtml(md) {
  const lines = md.split(/\r?\n/)
  let out = ''
  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // fenced code block
    const fence = line.match(/^```(\w*)/)
    if (fence) {
      const lang = fence[1] || ''
      i++
      let buf = ''
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf += lines[i] + '\n'
        i++
      }
      i++ // closing fence
      out += `<pre class="lang-${lang}"><code>${escapeHtml(buf.replace(/\n$/, ''))}</code></pre>\n`
      continue
    }

    // table
    if (/^\|.+\|\s*$/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const rows = [line, lines[i + 1]]
      i += 2
      while (i < lines.length && /^\|.+\|\s*$/.test(lines[i])) {
        rows.push(lines[i])
        i++
      }
      out += renderTable(rows) + '\n'
      continue
    }

    // headings
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      const lvl = h[1].length
      out += `<h${lvl}>${inline(escapeHtml(h[2]))}</h${lvl}>\n`
      i++
      continue
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      let buf = ''
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf += lines[i].replace(/^>\s?/, '') + ' '
        i++
      }
      out += `<blockquote>${inline(escapeHtml(buf.trim()))}</blockquote>\n`
      continue
    }

    // unordered list (incl. task list checkboxes)
    if (/^\s*[-*]\s+/.test(line)) {
      out += '<ul>\n'
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        let item = lines[i].replace(/^\s*[-*]\s+/, '')
        let cls = ''
        const task = item.match(/^\[([ xX])\]\s+(.*)$/)
        if (task) {
          const checked = task[1].toLowerCase() === 'x'
          cls = ' class="task"'
          item = `<span class="box">${checked ? '☒' : '☐'}</span> ${task[2]}`
          out += `<li${cls}>${inline(escapeHtml(item).replace(/&lt;span class=&quot;box&quot;&gt;([☒☐])&lt;\/span&gt;/, '<span class="box">$1</span>'))}</li>\n`
        } else {
          out += `<li>${inline(escapeHtml(item))}</li>\n`
        }
        i++
      }
      out += '</ul>\n'
      continue
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      out += '<ol>\n'
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        out += `<li>${inline(escapeHtml(lines[i].replace(/^\s*\d+\.\s+/, '')))}</li>\n`
        i++
      }
      out += '</ol>\n'
      continue
    }

    // blank line
    if (/^\s*$/.test(line)) {
      i++
      continue
    }

    // paragraph (consume until blank line or block element)
    let buf = ''
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\|.+\|\s*$/.test(lines[i])
    ) {
      buf += lines[i] + ' '
      i++
    }
    if (buf.trim()) out += `<p>${inline(escapeHtml(buf.trim()))}</p>\n`
  }
  return out
}

const CSS = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1a1a1a;
    font-size: 11pt;
    line-height: 1.55;
    margin: 0;
    padding: 0 14mm;
  }
  header.cover {
    border-bottom: 2px solid #e64a19;
    padding: 18mm 0 6mm;
    margin-bottom: 10mm;
  }
  header.cover .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 9pt;
    color: #e64a19;
    font-weight: 600;
  }
  header.cover h1 {
    font-size: 22pt;
    margin: 4mm 0 2mm;
    line-height: 1.2;
  }
  header.cover .meta {
    font-size: 9.5pt;
    color: #666;
  }
  h1, h2, h3, h4 { line-height: 1.25; }
  h2 { font-size: 14pt; margin: 8mm 0 3mm; color: #1a1a1a; border-bottom: 1px solid #eee; padding-bottom: 1.5mm; }
  h3 { font-size: 12pt; margin: 6mm 0 2mm; color: #333; }
  h4 { font-size: 10.5pt; margin: 4mm 0 1mm; color: #333; }
  p { margin: 2mm 0; }
  ul, ol { margin: 2mm 0 2mm 5mm; padding: 0; }
  li { margin: 0.8mm 0; }
  li.task .box { color: #e64a19; margin-right: 1mm; }
  blockquote {
    border-left: 3px solid #e64a19;
    background: #fdf5f1;
    padding: 3mm 4mm;
    margin: 3mm 0;
    color: #444;
    font-style: italic;
  }
  code {
    font-family: "SF Mono", Menlo, Consolas, monospace;
    font-size: 9.5pt;
    background: #f3f3f3;
    padding: 0.5mm 1.2mm;
    border-radius: 1mm;
  }
  pre {
    background: #f7f7f7;
    border: 1px solid #e5e5e5;
    border-radius: 1.5mm;
    padding: 3mm 4mm;
    overflow-x: auto;
    font-size: 9pt;
    line-height: 1.45;
    page-break-inside: avoid;
  }
  pre code { background: none; padding: 0; font-size: inherit; }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 3mm 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid #e0e0e0;
    padding: 1.5mm 2mm;
    text-align: left;
    vertical-align: top;
  }
  th { background: #fafafa; font-weight: 600; }
  a { color: #e64a19; text-decoration: none; }
  footer.foot {
    margin-top: 12mm;
    padding-top: 3mm;
    border-top: 1px solid #eee;
    font-size: 8.5pt;
    color: #888;
    text-align: center;
  }
`

function htmlDoc({ title, bodyHtml }) {
  const today = new Date().toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>${CSS}</style>
</head>
<body>
  <header class="cover">
    <div class="eyebrow">SportNexus · Konzept</div>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">Stand: ${today}</div>
  </header>
  ${bodyHtml}
  <footer class="foot">SportNexus · vertraulich · ${today}</footer>
</body>
</html>`
}

async function main() {
  await mkdir(path.join(ROOT, 'pdfs'), { recursive: true })
  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  for (const doc of DOCS) {
    const md = await readFile(path.join(ROOT, doc.src), 'utf8')
    // strip first H2 (it's the title — we already render a cover)
    const stripped = md.replace(/^##\s+.*\n/, '')
    const bodyHtml = mdToHtml(stripped)
    const html = htmlDoc({ title: doc.title, bodyHtml })
    // Save HTML next to PDF for debugging / future tweaks
    const htmlPath = path.join(ROOT, doc.out.replace(/\.pdf$/, '.html'))
    await writeFile(htmlPath, html, 'utf8')
    const page = await ctx.newPage()
    await page.setContent(html, { waitUntil: 'networkidle' })
    const pdfPath = path.join(ROOT, doc.out)
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      margin: { top: '14mm', bottom: '14mm', left: '0mm', right: '0mm' },
      printBackground: true,
    })
    await page.close()
    console.log('PDF →', path.relative(ROOT, pdfPath))
  }
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
