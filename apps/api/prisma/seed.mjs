import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const reset = process.argv.includes("--reset-demo");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const ago = (days) => new Date(Date.now() - days * 86400000).toISOString();
const day = (days) => ago(days).slice(0, 10);
try {
  await prisma.$transaction(
    async (tx) => {
      // The explicit demo reset remains opt-in. Ordinary seeding never clears records.
      if (reset)
        await tx.$executeRaw`TRUNCATE audit,joins,follows,sessions,records,users,teams RESTART IDENTITY CASCADE`;
      const empty = (await tx.users.count()) === 0;
      await tx.skills.createMany({
        data: [
          "Accessibility",
          "Architecture",
          "AWS",
          "Communication",
          "Customer research",
          "Customer success",
          "Data analysis",
          "Docker",
          "Financial planning",
          "GraphQL",
          "JavaScript",
          "Leadership",
          "NestJS",
          "Next.js",
          "Node.js",
          "Onboarding",
          "Operations",
          "PostgreSQL",
          "Product design",
          "Product management",
          "Project management",
          "Python",
          "React",
          "Research",
          "SQL",
          "Testing",
          "TypeScript",
          "UX design",
          "Verification",
          "Workspace administration",
        ].map((name) => ({ name })),
        skipDuplicates: true,
      });
      if (!empty && !reset) return;
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
        [
          "platform",
          "Platform",
          "Keep shared services reliable and accessible.",
        ],
        [
          "people",
          "People & Culture",
          "Make collaboration welcoming and sustainable.",
        ],
      ];
      for (const t of teams)
        await tx.teams.upsert({
          where: { id: t[0] },
          update: {},
          create: { id: t[0], name: t[1], mission: t[2] },
        });
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
        await tx.users.upsert({
          where: { id: p[0] },
          update: {},
          create: {
            id: p[0],
            name: p[1],
            title: p[2],
            role: p[3],
            team_id: p[4],
            skills: p[5],
          },
        });
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
        await tx.records.upsert({
          where: { id },
          update: {},
          create: {
            id,
            kind,
            title,
            body,
            team_id: team,
            visibility,
            owner_id: owner,
            data,
            created_at: new Date(ago(days)),
            updated_at: new Date(ago(days)),
          },
        });
      for (const [u, t] of [
        ["maya", "operations"],
        ["sam", "product"],
        ["alex", "growth"],
        ["leo", "product"],
        ["ella", "operations"],
      ])
        await tx.follows.upsert({
          where: { user_id_team_id: { user_id: u, team_id: t } },
          update: {},
          create: { user_id: u, team_id: t },
        });
      for (const [u, r] of [
        ["maya", "allocation-research"],
        ["sam", "allocation-research"],
        ["leo", "allocation-guides"],
      ])
        await tx.joins.upsert({
          where: { user_id_record_id: { user_id: u, record_id: r } },
          update: {},
          create: { user_id: u, record_id: r },
        });
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
        if (empty)
          await tx.audit.create({
            data: {
              actor_id: actor,
              action,
              record_id: id,
              team_id: team,
              detail: {
                fixture: true,
                note: "Fictional Northstar demonstration history",
                after: record ? { title: record[2], ...record[7] } : {},
              },
              created_at: new Date(ago(days)),
            },
          });
      }
    },
    { timeout: 30000 },
  );
  console.log(
    reset
      ? "Clean Northstar demo seeded; sessions cleared."
      : "Prisma seed complete; existing workspace data preserved.",
  );
} finally {
  await prisma.$disconnect();
}
