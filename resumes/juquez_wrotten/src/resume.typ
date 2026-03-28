// ── Juquez D. Wrotten — Resume ────────────────────────────────────
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
  name:    "Juquez D. Wrotten",
  address: "Houston, Texas",
  contact: [346.244.6389 | Jwrotten17\@icloud.com | #link("https://www.linkedin.com/in/juquez-wrotten")[linkedin.com/in/juquez-wrotten]],
)

// ── Professional Summary ─────────────────────────────────────────
#section("Professional Summary", [
  University of Houston graduate with a double major in Management Information Systems and Marketing, bringing hands-on experience in systems analysis, business process mapping, and technology implementation. Currently serving as a System Analyst at a healthcare-affiliated organization, where I document workflows, gather requirements, and build dashboards that drive operational decisions. Seeking to apply my technical foundation and cross-functional project experience in a consulting environment.
])

// ── Education ─────────────────────────────────────────────────────
#section("Education", [
  #role(
    company: "University of Houston — C.T. Bauer College of Business",
    info:    "Houston, Texas",
    title:   "Bachelor of Business Administration (BBA), Management Information Systems & Marketing",
    date:    "2024",
  )[
    #note[#text(weight: "bold")[Relevant Coursework:] Systems Analysis & Design, IT Project Management, Database Management (SQL/Oracle), IS Management & Consulting, Cloud & Generative AI Solutions] \
    #note[#text(weight: "bold")[Honors & Activities:] Deloitte Summer Bridge Program (2023) · Jesse H. Jones Business Leadership Development Program (2024) · The Collective Generational Mentoring Foundation (2024)]
  ]
])

// ── Experience ───────────────────────────────────────────────────
#section("Professional Experience", [

  #role(
    company: "Surplus Marketplace (MD Anderson / UT Physicians)",
    info:    "Houston, Texas",
    title:   "Project Associate / System Analyst",
    date:    "April 2025 -- Present",
  )[
    #bullets(
      [Map end-to-end business processes for auction and asset removal workflows across 3 departments, documenting system requirements and identifying gaps between current-state operations and target architecture],
      [Lead 4 concurrent warehouse and asset removal projects valued at \$200K+ in recoverable assets, coordinating stakeholders across procurement, facilities, and IT from requirements gathering through delivery],
      [Design 5+ performance dashboards tracking auction KPIs and inventory turnover, translating raw data into executive-level reporting that informs \$100K+ in quarterly asset disposition decisions],
      [Develop and maintain project schedules, RACI matrices, and status reports for 10+ stakeholders, maintaining 95% on-time delivery across all active projects],
    )
  ]

  #role(
    company: "Nature In Home Health Care",
    info:    "West Memphis, Arkansas",
    title:   "Technical Support & Data Entry Specialist",
    date:    "February 2024 -- Present",
  )[
    #bullets(
      [Administer and troubleshoot internal database systems, resolving 30+ technical issues monthly and improving system usability for 20+ end users],
      [Maintain HIPAA-compliant client records across 3 databases covering 500+ active patients, performing weekly data validation and audits to ensure regulatory compliance],
      [Redesign caregiver timekeeping workflow by identifying manual bottlenecks, reducing payroll processing time by 20% and eliminating ~\$5K/quarter in payroll discrepancies],
      [Document 50+ system issues, root causes, and resolutions to build an internal knowledge base, reducing repeat support requests by 35%],
    )
  ]

  #role(
    company: "Best Buy",
    info:    "Houston, Texas",
    title:   "Project Team / Sales Associate",
    date:    "September 2023 -- Present",
  )[
    #bullets(
      [Own end-to-end fulfillment operations processing 100+ orders daily including receiving, inventory allocation, and order dispatch, achieving 98% delivery accuracy through process standardization],
      [Analyze weekly inventory and fulfillment reports covering 2,000+ SKUs to identify demand patterns and stock gaps, reducing stockout incidents by 15%],
      [Train and onboard 8+ new team members on POS systems, inventory tools, and operational workflows, reducing ramp-up time from 3 weeks to under 2 weeks],
      [Propose and implement process changes to the order pick-and-pack workflow that reduced average processing time by 20%, saving an estimated 10+ labor hours per week],
    )
  ]

])

// ── Technical Skills ─────────────────────────────────────────────
#section("Technical Skills", [
  #skills-table(
    ("Languages & Data",    "SQL, Python, Excel (Advanced), Oracle Database"),
    ("Tools & Platforms",   "Power BI, Tableau, Visio, Jira, ServiceNow, Microsoft 365"),
    ("Methodologies",       "Agile (Scrum), Waterfall, SDLC, Business Process Modeling, Requirements Gathering"),
    ("Domains",             "Business Architecture, Systems Analysis, Process Optimization, Data Governance"),
    ("Certifications",      "Microsoft Business Analysis Fundamentals (2026)"),
  )
])
