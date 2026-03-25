// ── Christopher Robinson — Resume ─────────────────────────────────
// Content only. Visual constants → theme.typ, macros → sections.typ
#import "theme.typ": *
#import "sections.typ": *

#set page(
  paper: "us-letter",
  margin: page-margins,
)
#set text(font: body-font, size: body-size, hyphenate: false)
#set par(leading: 0.6em, spacing: 0pt, justify: false)

// ── Header ────────────────────────────────────────────────────────
#resume-header(
  name:    "Christopher Robinson",
  address: "Atlanta, GA / Remote",
  contact: "713-560-1420 | RobinsonChristopher@icloud.com",
)

// ── Education ─────────────────────────────────────────────────────
#section("Education", [
  #role(
    company: "Harvard University",
    info:    "",
  )[
    Biomedical Engineering | Minor in Computer Science \
    #note[Involvement: Varsity Football Team, DJ on WHRB 95.3FM, President of Alpha Phi Alpha, Board member of Harvard College in Asia Program]
  ]
])

// ── Work Experience ───────────────────────────────────────────────
#section("Work Experience", [

  #role(
    company: "Accenture Strategy & Consulting",
    info:    "Atlanta, Ga",
    title:   "Data & AI Strategy Practice",
    date:    "September 2018 – Present",
  )[]

  #role(
    company: "Engineering Manager & Contract Delivery Lead at Meta",
    info:    "(Accenture Client: 2024-2026)",
  )[
    #bullets(
      [Directed data strategy and engineering implementation across 8 workstreams (5 data infra, 3 product), managing a 31-person cross-functional team of managers and engineers over 18+ months],
      [Oversaw \$15 million in total contract value across 4 separate client contracts, driving >\$1.5 million in direct client savings and securing 3+ contract renewals],
      [Architected and optimized 100+ data infrastructure pipelines utilizing Python, SQL, and Agentic AI workflows, contributing 50,000+ lines of validated code],
      [Spearheaded the AI engineering product offering for the Meta & Accenture partnership, deploying Agentic AI workflows that reduced manual labor by 90% across 30+ processes and 5+ teams],
    )
  ]

  #role(
    company: "Data Engineering Consultant at Meta",
    info:    "(Accenture Client: 2021-2024)",
  )[
    #bullets(
      [Led data strategy development for 10+ cross-functional work-streams which included the development of 25+ dashboards and 50+ automated data pipelines],
      [Developed comprehensive data road-maps for the ingestion and consumption of both internal and external marketing data across 5+ lines of business],
      [Managed, optimized and developed 50+ marketing analytics pipelines leveraging python, SQL and automation platforms],
    )
  ]

  #role(
    company: "Data Science Consultant at Leading US Healthcare Company",
    info:    "(Accenture Client: 2019-2021)",
  )[
    #bullets(
      [Developed 10+ interactive financial dashboards tracking cost-cutting and excess spending, visualizing and driving >\$30 million in enterprise savings],
      [Designed solutions for 200+ healthcare cost-saving initiatives leveraging autonomous data exploration and peer-reviewed research],
      [Spearheaded a program-wide initiative to identify workstream overlap, recovering missed opportunities and realizing an additional \$500k in client savings],
    )
  ]

  #role(
    company: "Artificial Intelligence Analyst at Global Logistics Automation Company",
    info:    "(Accenture Client: 2019)",
  )[
    #bullets(
      [Developed and configured AI to record client's work processes and analyze Accounts Payable department],
      [Analyzed client's system logs using advanced data analytics to create a KPI-driven dashboard and visualize AI-driven insights leading to \$350k in client savings],
    )
  ]

])

// ── Personal Software Development ────────────────────────────────
#section("Personal Software Development", [

  #role(
    company: "Artist Advisory",
    info:    "artistadvisory.io · 2025 – Present",
    title:   "AI Music Career Intelligence Platform",
  )[
    #bullets(
      [Engineered a production SaaS platform powered by 15 specialized AI agents, processing thousands of daily Spotify and social data points to deliver actionable career intelligence; 6-tier subscription model, affiliate referral program, Redis-backed job queues, and weekly AI-generated audio podcast via TTS synthesis],
      [Stack: Next.js, FastAPI, PostgreSQL, Redis, Claude API, Stripe, SwiftUI iOS],
    )
  ]

  #role(
    company: "PocketBuddy",
    info:    "pocketbuddy.org · 2026 – Present",
    title:   "AI Personal Finance Advisor with Native iOS Companion",
  )[
    #bullets(
      [Architected a full-stack personal finance platform featuring 6 domain-specialized AI agents and a native SwiftUI iOS companion; Plaid API for real-time bank connectivity, Stripe for subscriptions, and weekly TTS-generated financial audio briefings],
      [Stack: Next.js, FastAPI, PostgreSQL, OpenAI, SwiftUI iOS, Plaid, Stripe],
    )
  ]

])

// ── Technical Strengths ───────────────────────────────────────────
#section("Technical Strengths", [
  #skills-table(
    ("Programming",  "Python, SQL, TypeScript, JavaScript, Swift, Bash, Agentic Code Development"),
    ("Data & Tools", "Claude Code, FastAPI, PostgreSQL, Redis, Next.js, Snowflake, Spark, PrestoDB, Power BI/Tableau"),
    ("Expertise",    "AI Engineering, Data Engineering, Full-Stack Dev, iOS Dev, Cloud Platforms, Workflow Automation"),
    ("Interests",    "Applied AI, Entrepreneurship, Music Production, Audio Engineering"),
  )
])
