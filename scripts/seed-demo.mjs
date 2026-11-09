import { Pool } from "pg";
if (!process.argv.includes("--reset-demo") || !process.env.DATABASE_URL)
  throw new Error(
    "Requires DATABASE_URL and explicit --reset-demo. Back up the database first.",
  );
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();
const ago = (days) => new Date(Date.now() - days * 86400000).toISOString();
const day = (days) => ago(days).slice(0, 10);
try {
  await c.query("BEGIN");
  await c.query(
    "TRUNCATE audit,joins,follows,sessions,records,users,teams RESTART IDENTITY CASCADE",
  );
  const teams = [
    [
      "product",
      "Product & Engineering",
      "Make the first week with Northstar feel effortless.",
    ],
    [
      "operations",
      "Customer Operations",
      "Turn recurring customer questions into useful guidance.",
    ],
    [
      "growth",
      "Growth & Partnerships",
      "Help independent teams discover a better way to work.",
    ],
    ["platform", "Platform", "Keep shared services reliable and accessible."],
    [
      "people",
      "People & Culture",
      "Make collaboration welcoming and sustainable.",
    ],
  ];
  for (const t of teams)
    await c.query("INSERT INTO teams(id,name,mission) VALUES($1,$2,$3)", t);
  const people = [
    [
      "maya",
      "Maya Chen",
      "Product designer",
      "employee",
      "product",
      ["Product design", "Research"],
    ],
    [
      "alex",
      "Alex Morgan",
      "Engineering lead",
      "lead",
      "product",
      ["TypeScript", "Architecture"],
    ],
    [
      "jordan",
      "Jordan Lee",
      "Finance partner",
      "finance",
      "operations",
      ["Financial planning", "Operations"],
    ],
    [
      "sam",
      "Sam Rivera",
      "Customer success specialist",
      "employee",
      "operations",
      ["Customer research", "Onboarding"],
    ],
    [
      "priya",
      "Priya Shah",
      "Partnerships lead",
      "lead",
      "growth",
      ["Communication", "Project management"],
    ],
    [
      "leo",
      "Leo Santos",
      "Growth researcher",
      "employee",
      "growth",
      ["Research", "Data analysis"],
    ],
    [
      "nina",
      "Nina Park",
      "Platform lead",
      "lead",
      "platform",
      ["PostgreSQL", "Architecture"],
    ],
    [
      "owen",
      "Owen Brooks",
      "Platform engineer",
      "employee",
      "platform",
      ["Docker", "TypeScript"],
    ],
    [
      "imani",
      "Imani Cole",
      "People lead",
      "lead",
      "people",
      ["Leadership", "Onboarding"],
    ],
    [
      "ella",
      "Ella Martin",
      "People coordinator",
      "employee",
      "people",
      ["Communication", "Operations"],
    ],
    [
      "root",
      "Root Admin",
      "Demo administrator",
      "root",
      "product",
      ["Workspace administration"],
    ],
  ];
  for (const p of people)
    await c.query(
      "INSERT INTO users(id,name,title,role,team_id,skills) VALUES($1,$2,$3,$4,$5,$6)",
      p,
    );
  const records = [
    [
      "post-launch",
      "post",
      "First-week onboarding: what we learned",
      "Five customer conversations highlighted a common obstacle: teams could not tell which setup steps mattered most. The revised welcome checklist now puts those steps first.",
      "product",
      "company",
      "maya",
      {},
      2,
    ],
    [
      "post-private",
      "post",
      "Next onboarding review",
      "The engineering review will focus on keyboard navigation and invitation delivery. Alex and Maya will bring the remaining acceptance checks to Thursday’s review.",
      "product",
      "team",
      "alex",
      {},
      1,
    ],
    [
      "post-guides",
      "post",
      "Eight answers ready for new customers",
      "Our first eight onboarding guides are published. Sam is collecting examples for the next twelve, especially around invitations and shared goals.",
      "operations",
      "company",
      "sam",
      {},
      3,
    ],
    [
      "post-partners",
      "post",
      "Partner workshop: a useful first conversation",
      "Three of five discovery interviews are complete. Partners want a concise workshop kit with examples they can adapt to their teams.",
      "growth",
      "company",
      "priya",
      {},
      5,
    ],
    [
      "recognition-sam",
      "recognition",
      "Thank you for connecting the dots",
      "Sam brought recurring customer questions into the onboarding review and helped us simplify the welcome checklist.",
      "operations",
      "company",
      "maya",
      { recipient: "sam", badge: "Collaboration" },
      2,
    ],
    [
      "goal-onboarding",
      "goal",
      "Make onboarding feel effortless",
      "Help a new team complete its first useful workflow without a support call.",
      "product",
      "company",
      "alex",
      {
        progress: 75,
        completed: 3,
        total: 4,
        unit: "acceptance checks",
        target: "Pass all four first-week acceptance checks",
        evidence:
          "Checklist clarity, keyboard navigation and first goal creation passed the review. Invitation delivery remains open: three of four checks are complete.",
        evidenceDate: day(2),
      },
      2,
    ],
    [
      "goal-support",
      "goal",
      "Build a shared customer knowledge base",
      "Publish practical answers to the questions new customers ask most often.",
      "operations",
      "company",
      "jordan",
      {
        progress: 40,
        completed: 8,
        total: 20,
        unit: "published guides",
        target: "Publish 20 reviewed onboarding guides",
        evidence:
          "Eight guides have been reviewed and published in the customer help collection. Twelve remain in drafting or review.",
        evidenceDate: day(3),
      },
      3,
    ],
    [
      "goal-partners",
      "goal",
      "Shape the partner workshop",
      "Validate a workshop outline with partners before preparing the full kit.",
      "growth",
      "company",
      "priya",
      {
        progress: 60,
        completed: 3,
        total: 5,
        unit: "discovery interviews",
        target: "Complete five partner discovery interviews",
        evidence:
          "Three partner interviews informed the outline. Two interviews remain unscheduled; refresh the synthesis after they are complete.",
        evidenceDate: day(18),
      },
      18,
    ],
    [
      "allocation-research",
      "allocation",
      "Help shape the next onboarding experience",
      "Join Maya to synthesize customer feedback and check the final invitation flow. Expressing interest is a conversation, not a commitment.",
      "product",
      "company",
      "alex",
      { hours: 4, capacity: 8, needed: 16 },
      2,
    ],
    [
      "allocation-guides",
      "allocation",
      "Share your customer expertise",
      "Help Sam turn customer questions into short, reusable guides. Choose a topic that matches your experience.",
      "operations",
      "company",
      "jordan",
      { hours: 4, capacity: 6, needed: 18 },
      3,
    ],
    [
      "allocation-workshop",
      "allocation",
      "Co-create a partner workshop",
      "Help review examples for a practical workshop kit. The team has enough planned capacity but welcomes relevant perspectives.",
      "growth",
      "company",
      "priya",
      { hours: 2, capacity: 8, needed: 8 },
      5,
    ],
    [
      "budget-product",
      "budget",
      "Product pilot budget",
      "Research, shared infrastructure and first-week customer support.",
      "product",
      "finance",
      "jordan",
      {
        planned: 18000,
        actual: 11200,
        driver:
          "Research: $4,200; infrastructure: $3,000; pilot operations: $4,000. Remaining funds cover the final invitation-flow review.",
        currency: "USD",
      },
      2,
    ],
    [
      "budget-operations",
      "budget",
      "Customer enablement budget",
      "Knowledge base production and onboarding materials.",
      "operations",
      "finance",
      "jordan",
      {
        planned: 10000,
        actual: 10800,
        driver:
          "Content: $6,800; tooling: $4,000. The $800 overspend funded an additional accessibility review requested after the first eight guides. Jordan recorded the justification for review.",
        currency: "USD",
      },
      1,
    ],
  ];
  for (const [
    id,
    kind,
    title,
    body,
    team,
    visibility,
    owner,
    data,
    days,
  ] of records)
    await c.query(
      "INSERT INTO records(id,kind,title,body,team_id,visibility,owner_id,data,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)",
      [
        id,
        kind,
        title,
        body,
        team,
        visibility,
        owner,
        JSON.stringify(data),
        ago(days),
      ],
    );
  for (const [u, t] of [
    ["maya", "operations"],
    ["sam", "product"],
    ["alex", "growth"],
    ["leo", "product"],
    ["ella", "operations"],
  ])
    await c.query("INSERT INTO follows VALUES($1,$2)", [u, t]);
  for (const [u, r] of [
    ["maya", "allocation-research"],
    ["sam", "allocation-research"],
    ["leo", "allocation-guides"],
  ])
    await c.query("INSERT INTO joins VALUES($1,$2)", [u, r]);
  const history = [
    ["priya", "update goal", "goal-partners", "growth", 18],
    ["sam", "create post", "post-guides", "operations", 3],
    ["maya", "create post", "post-launch", "product", 2.5],
    ["alex", "update goal", "goal-onboarding", "product", 2],
    ["sam", "join opportunity", "allocation-research", "product", 1.5],
    ["jordan", "update budget", "budget-operations", "operations", 1],
  ];
  for (const [actor, action, id, team, days] of history) {
    const record = records.find((r) => r[0] === id);
    await c.query(
      "INSERT INTO audit(actor_id,action,record_id,team_id,detail,created_at) VALUES($1,$2,$3,$4,$5,$6)",
      [
        actor,
        action,
        id,
        team,
        JSON.stringify({
          fixture: true,
          note: "Fictional Northstar demonstration history",
          after: record ? { title: record[2], ...record[7] } : {},
        }),
        ago(days),
      ],
    );
  }
  await c.query("COMMIT");
  console.log(
    "Clean Northstar demo seeded: 5 teams, 10 colleagues, 3 measured goals, 20 hrs/week capacity gap, 6 fictional audit events. Sessions cleared.",
  );
} catch (e) {
  await c.query("ROLLBACK");
  throw e;
} finally {
  c.release();
  await pool.end();
}
