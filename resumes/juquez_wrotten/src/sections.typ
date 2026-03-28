// ── Macro library ── keeps resume.typ purely declarative ─────────
#import "theme.typ": *

// ── Document header ───────────────────────────────────────────────
#let resume-header(name: "", address: "", contact: "") = {
  set align(center)
  block(text(font: body-font, size: name-size)[#name])
  v(6pt)
  block(text(font: body-font, size: body-size)[
    #address \
    #contact
  ])
  v(8pt)
}

// ── Section block: UPPERCASE BOLD TITLE + full-width rule ─────────
#let section(title, body) = {
  v(8pt)
  block(width: 100%, text(font: body-font, size: body-size, weight: "bold")[#upper(title)])
  v(3pt)
  line(length: 100%, stroke: 0.5pt + rule-color)
  v(6pt)
  pad(left: 12pt, body)
}

// ── Role: one position in any section ─────────────────────────────
#let role(company: "", info: "", title: "", date: "", body) = {
  set text(font: body-font, size: body-size)
  block(width: 100%, {
    text(weight: "bold")[#company]
    h(1fr)
    text(size: 9pt)[#info]
    if title != "" or date != "" {
      linebreak()
      text(style: "italic")[#title]
      h(1fr)
      text(style: "italic")[#date]
    }
  })
  v(5pt)
  block(width: 100%, body)
  v(10pt)
}

// ── Bullet list ───────────────────────────────────────────────────
#let bullets(..items) = {
  set text(font: body-font, size: body-size)
  set par(leading: 0.65em, spacing: 0pt, justify: false)
  set list(
    marker: [·],
    indent: 1.5em,
    body-indent: 0.4em,
    spacing: 7pt,
  )
  block(width: 100%, list(..items.pos()))
}

// ── Two-column skills table ───────────────────────────────────────
#let skills-table(..rows) = {
  set text(font: body-font, size: body-size)
  set par(leading: 0.5em, spacing: 0pt)

  let items = ()
  for row in rows.pos() {
    items.push(text(weight: "bold")[#row.at(0):])
    items.push(row.at(1))
  }

  block(width: 100%, grid(
    columns: (auto, 1fr),
    column-gutter: 1.5em,
    row-gutter: 0.6em,
    ..items
  ))
}

// ── Muted small note (involvement, extra info) ────────────────────
#let note(body) = {
  text(font: body-font, size: 8.5pt, fill: muted)[#body]
}
