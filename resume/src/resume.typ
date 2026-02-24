// ── Christopher Robinson — Resume ─────────────────────────────────
// Content only. Visual constants → theme.typ, macros → sections.typ
#import "theme.typ": *
#import "sections.typ": *

#set page(
  paper: "us-letter",
  margin: page-margins,
)
#set text(font: body-font, size: body-size)
#set par(leading: 0.6em, spacing: 0pt, justify: true)

// ── Header ────────────────────────────────────────────────────────
#resume-header(
  name:    "Christopher Robinson",
  address: "2140 Enon Mill Dr SW | Atlanta, GA 30331",
  contact: "713-560-1420 | RobinsonChristopher@icloud.com",
)

// ── Education ─────────────────────────────────────────────────────
#section("Education", [
  #role(
    company: "Harvard University",
    info:    "August 2014 – May 2018",
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
    title:   "Data & AI Strategy Consultant",
    date:    "September 2018 – Present",
  )[]

  #role(
    company: "Engineering Manager & Contract Delivery Lead at Meta",
    info:    "(Accenture Client: 2024-2026)",
  )[
    #bullets(
      [Led data strategy and engineering implementation across 5 data infra and 3 product workstreams, managing a total of 31 managers, analysts, and engineers over 18+ months resulting in 3+ contract renewals and > 1.5 million in client savings],
      [Managed ~\$15 million in total contract value across 4 separate client contracts],
      [Developed and optimized 100+ Data Infrastructure pipelines using Python, SQL, and agentic AI workflows. Designed, validated, and delivered 50,000+ lines of code changes.],
      [Led and implemented the AI engineering products offering for Meta & Accenture partnership. Collaborated with 5+ directors, 4 Engineering Managers and 10+ data engineers to deliver Agentic AI workflows that reduced manual labor by 90% across 20+ processes.],
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
      [Built 10+ interactive dashboards centered around cost-cutting and excess spending to visualize > \$30 mil in savings],
      [Solutioned for 200+ healthcare cost-saving initiatives using autonomous data exploration and peer-reviewed research],
      [Spearheaded program-wide initiative to identify overlap between work-streams and find missed areas of opportunity for client value realization resulting in \$500k of additional identified savings],
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

  #role(
    company: "Cloud Migration Analyst at Large US Bank Holding Company",
    info:    "(Accenture Client: 2018-2019)",
  )[
    #bullets(
      [Managed 30,000 + process extensions to mitigate cloud migration risks and performed daily deprecation assessments],
      [Spearheaded automated program that leveraged Snowflake data to identify risks and guide migration program],
      [Developed 3+ ETL tools in python to extract enterprise data from Snowflake and S3 Resources then perform analysis and present to executive stakeholders],
    )
  ]

])

// ── Volunteer Experience ──────────────────────────────────────────
#section("Volunteer Experience", [
  #role(
    company: "The Collective Generational Mentoring Foundation",
    info:    "September 2018 – Present",
    title:   "Scholarship Committee Board Member",
  )[
    #bullets(
      [Created writing prompts for application process and reviewed 50+ applicants essays for the selection committee],
      [Aided logistics, operations and technology management for annual mentorship summit with 100+ attendees],
    )
  ]
])

// ── Technical Strengths ───────────────────────────────────────────
#section("Technical Strengths", [
  #skills-table(
    ("Programming",  "Python, SQL, JavaScript, HTML, Bash, Agentic Code Development"),
    ("Data & Tools", "Claude Code, Codex, Spark, PrestoDB, Hive, Power BI/Tableau, SharePoint"),
    ("Expertise",    "AI Engineering, Data Engineering, Cloud Platforms, Workflow Automation, Database Optimization"),
    ("Interests",    "Applied AI, Entrepreneurship, Music Production, Audio Engineering"),
  )
])
