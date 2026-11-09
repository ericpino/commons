import "reflect-metadata";
import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Req,
  Res,
  Module,
  Injectable,
  Inject,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Pool, PoolClient } from "pg";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { Request, Response } from "express";
import helmet from "helmet";
import { schema } from "./schema";
import { canRead, canManage, money, User } from "./policy";

function text(v: unknown, max = 2000): string {
  if (typeof v !== "string" || !v.trim() || v.length > max)
    throw new BadRequestException(`Text must be 1–${max} characters`);
  return v.trim();
}
@Injectable()
class Database implements OnModuleInit {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  async onModuleInit() {
    if (!process.env.DATABASE_URL || !process.env.DEMO_PASSWORD)
      throw new Error("DATABASE_URL and DEMO_PASSWORD are required");
    await this.pool.query(schema);
  }
  async transaction<T>(fn: (c: PoolClient) => Promise<T>) {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      const result = await fn(c);
      await c.query("COMMIT");
      return result;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
}
@Controller()
class Api {
  constructor(@Inject(Database) private readonly db: Database) {}
  async user(req: Request): Promise<User> {
    const token = req.headers.cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("commons_session="))
      ?.slice(16);
    if (!token) throw new UnauthorizedException("Please sign in");
    const { rows } = await this.db.pool.query(
      "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=$1 AND s.expires_at>now()",
      [token],
    );
    if (!rows[0]) throw new UnauthorizedException("Session expired");
    return rows[0];
  }
  async audit(
    c: PoolClient,
    u: User,
    action: string,
    id: string,
    team: string,
    detail: object = {},
  ) {
    await c.query(
      "INSERT INTO audit(actor_id,action,record_id,team_id,detail) VALUES($1,$2,$3,$4,$5)",
      [u.id, action, id, team, JSON.stringify(detail)],
    );
  }
  @Get("health") async health() {
    await this.db.pool.query("SELECT 1");
    return { status: "ok" };
  }
  @Get("demo-users") async demo() {
    return (
      await this.db.pool.query(
        "SELECT id,name,role,title FROM users ORDER BY name",
      )
    ).rows;
  }
  @Post("login") async login(
    @Body() b: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const expected = Buffer.from(process.env.DEMO_PASSWORD!);
    const actual = Buffer.from(
      typeof b.password === "string" ? b.password : "",
    );
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw new UnauthorizedException("Incorrect demo password");
    const { rows } = await this.db.pool.query(
      "SELECT id FROM users WHERE id=$1",
      [b.userId],
    );
    if (!rows.length) throw new UnauthorizedException();
    const token = randomBytes(32).toString("hex");
    await this.db.pool.query("DELETE FROM sessions WHERE expires_at<now()");
    await this.db.pool.query(
      "INSERT INTO sessions VALUES($1,$2,now()+interval '8 hours')",
      [token, b.userId],
    );
    res.cookie("commons_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: 8 * 3600 * 1000,
      path: "/",
    });
    return { ok: true };
  }
  @Post("logout") async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.headers.cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("commons_session="))
      ?.slice(16);
    if (token)
      await this.db.pool.query("DELETE FROM sessions WHERE token=$1", [token]);
    res.clearCookie("commons_session", { path: "/" });
    return { ok: true };
  }
  @Get("workspace") async workspace(@Req() req: Request) {
    const u = await this.user(req);
    const [records, people, teams, joins, follows] = await Promise.all([
      this.db.pool.query("SELECT * FROM records ORDER BY created_at DESC"),
      this.db.pool.query("SELECT * FROM users ORDER BY name"),
      this.db.pool.query("SELECT * FROM teams ORDER BY name"),
      this.db.pool.query("SELECT record_id FROM joins WHERE user_id=$1", [
        u.id,
      ]),
      this.db.pool.query("SELECT team_id FROM follows WHERE user_id=$1", [
        u.id,
      ]),
    ]);
    return {
      user: u,
      records: records.rows.filter((r) => canRead(u, r.visibility, r.team_id)),
      people: people.rows,
      teams: teams.rows,
      joined: joins.rows.map((r) => r.record_id),
      following: follows.rows.map((r) => r.team_id),
      asOf: new Date().toISOString(),
    };
  }
  @Get("records/:id") async record(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    const u = await this.user(req);
    const { rows } = await this.db.pool.query(
      "SELECT * FROM records WHERE id=$1",
      [id],
    );
    if (!rows[0] || !canRead(u, rows[0].visibility, rows[0].team_id))
      throw new NotFoundException();
    return rows[0];
  }
  @Post("records") async create(@Req() req: Request, @Body() b: any) {
    const u = await this.user(req);
    if (
      !["post", "recognition", "goal", "allocation", "budget"].includes(b.kind)
    )
      throw new BadRequestException("Unknown module");
    const team = b.teamId || u.team_id;
    const exists = await this.db.pool.query(
      "SELECT id FROM teams WHERE id=$1",
      [team],
    );
    if (!exists.rows.length) throw new BadRequestException("Unknown team");
    if (["goal", "allocation"].includes(b.kind) && !canManage(u, team))
      throw new ForbiddenException(
        "Only a team lead or finance admin can manage this plan",
      );
    if (b.kind === "budget" && u.role !== "finance")
      throw new ForbiddenException("Finance access required");
    if (["post", "recognition"].includes(b.kind) && team !== u.team_id)
      throw new ForbiddenException("Publish to your own team");
    const title = text(b.title, 140),
      body = text(b.body);
    let visibility = b.visibility || "company";
    if (b.kind === "budget") visibility = "finance";
    else if (!["company", "team"].includes(visibility))
      throw new BadRequestException("Invalid visibility");
    let data: any = {};
    if (b.kind === "recognition") {
      const person = await this.db.pool.query(
        "SELECT id FROM users WHERE id=$1",
        [b.recipient],
      );
      if (!person.rows.length || b.recipient === u.id)
        throw new BadRequestException("Choose a colleague");
      data = { recipient: b.recipient, badge: "Collaboration" };
    }
    if (b.kind === "goal")
      data = {
        progress: 0,
        target: text(b.target, 200),
        evidence: "No evidence recorded yet",
      };
    if (b.kind === "allocation") data = { hours: 4, capacity: 0, needed: 8 };
    if (b.kind === "budget")
      data = {
        planned: 0,
        actual: 0,
        driver: "Awaiting finance entry",
        currency: "USD",
      };
    const id = randomUUID();
    return this.db.transaction(async (c) => {
      const { rows } = await c.query(
        "INSERT INTO records(id,kind,title,body,team_id,visibility,owner_id,data) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
        [id, b.kind, title, body, team, visibility, u.id, JSON.stringify(data)],
      );
      await this.audit(c, u, "create " + b.kind, id, team);
      return rows[0];
    });
  }
  @Patch("records/:id") async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() b: any,
  ) {
    const u = await this.user(req);
    return this.db.transaction(async (c) => {
      const { rows } = await c.query(
        "SELECT * FROM records WHERE id=$1 FOR UPDATE",
        [id],
      );
      const r = rows[0];
      if (!r || !canRead(u, r.visibility, r.team_id))
        throw new NotFoundException();
      if (r.kind === "budget" ? u.role !== "finance" : !canManage(u, r.team_id))
        throw new ForbiddenException();
      let data = { ...r.data };
      if (r.kind === "goal") {
        const progress = Number(b.progress);
        if (
          b.progress == null ||
          !Number.isFinite(progress) ||
          progress < 0 ||
          progress > 100
        )
          throw new BadRequestException("Progress must be 0–100");
        data = { ...data, progress, evidence: text(b.evidence, 1000) };
      } else if (r.kind === "budget") {
        try {
          data = {
            ...data,
            planned: money(b.planned),
            actual: money(b.actual),
            driver: text(b.driver, 1000),
          };
        } catch (e) {
          throw new BadRequestException((e as Error).message);
        }
      } else if (r.kind === "allocation") {
        try {
          data = {
            ...data,
            capacity: money(b.capacity),
            needed: money(b.needed),
          };
        } catch (e) {
          throw new BadRequestException((e as Error).message);
        }
      } else throw new BadRequestException("This record cannot be edited");
      await c.query("UPDATE records SET data=$1,updated_at=now() WHERE id=$2", [
        JSON.stringify(data),
        id,
      ]);
      await this.audit(c, u, "update " + r.kind, id, r.team_id, {
        before: r.data,
        after: data,
      });
      return { ok: true };
    });
  }
  @Post("records/:id/join") async join(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    const u = await this.user(req);
    return this.db.transaction(async (c) => {
      const { rows } = await c.query(
        "SELECT * FROM records WHERE id=$1 FOR UPDATE",
        [id],
      );
      const r = rows[0];
      if (!r || r.kind !== "allocation" || !canRead(u, r.visibility, r.team_id))
        throw new NotFoundException();
      const removed = await c.query(
        "DELETE FROM joins WHERE user_id=$1 AND record_id=$2 RETURNING *",
        [u.id, id],
      );
      if (!removed.rowCount)
        await c.query("INSERT INTO joins VALUES($1,$2)", [u.id, id]);
      await this.audit(
        c,
        u,
        removed.rowCount ? "leave opportunity" : "join opportunity",
        id,
        r.team_id,
      );
      return { joined: !removed.rowCount };
    });
  }
  @Patch("profile") async profile(@Req() req: Request, @Body() b: any) {
    const u = await this.user(req);
    if (!Array.isArray(b.skills) || b.skills.length > 12)
      throw new BadRequestException("Maximum 12 skills");
    const skills = [...new Set(b.skills.map((s: unknown) => text(s, 40)))];
    return this.db.transaction(async (c) => {
      await c.query("UPDATE users SET skills=$1 WHERE id=$2", [skills, u.id]);
      await this.audit(c, u, "update own expertise", u.id, u.team_id);
      return { ok: true };
    });
  }
  @Post("teams/:id/follow") async follow(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    const u = await this.user(req);
    if (
      !(await this.db.pool.query("SELECT id FROM teams WHERE id=$1", [id])).rows
        .length
    )
      throw new NotFoundException();
    return this.db.transaction(async (c) => {
      await c.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [u.id]);
      const result = await c.query(
        "DELETE FROM follows WHERE user_id=$1 AND team_id=$2 RETURNING *",
        [u.id, id],
      );
      if (!result.rowCount)
        await c.query("INSERT INTO follows VALUES($1,$2)", [u.id, id]);
      return { following: !result.rowCount };
    });
  }
  @Get("insights") async insights(@Req() req: Request) {
    const u = await this.user(req);
    const all = (
      await this.db.pool.query(
        "SELECT * FROM records WHERE kind IN ('goal','budget','allocation') ORDER BY title",
      )
    ).rows.filter((r) => canRead(u, r.visibility, r.team_id));
    const goals = all.filter((r) => r.kind === "goal"),
      budgets = all.filter((r) => r.kind === "budget"),
      allocations = all.filter((r) => r.kind === "allocation");
    const sum = (rows: any[], key: string) =>
      rows.reduce((n, r) => n + Number(r.data[key] || 0), 0);
    return {
      asOf: new Date().toISOString(),
      mode: "Deterministic source-backed summaries; no AI model is called.",
      coverage:
        "Only records visible to your role. Goal progress is owner-reported, not independently verified. Staffing capacity is a team planning estimate; invitations do not assign people.",
      answers: [
        {
          title: "How is our shared work progressing?",
          value: goals.length
            ? `${Math.round(sum(goals, "progress") / goals.length)}%`
            : "No data",
          explanation: `Unweighted average of ${goals.length} visible goals. Each goal contributes equally.`,
          sources: goals,
        },
        {
          title: "Where do we need more capacity?",
          value: `${allocations.reduce((n, r) => n + Math.max(0, r.data.needed - r.data.capacity), 0)} hrs`,
          explanation:
            "Sum of max(needed − available, 0) across visible opportunities, per week.",
          sources: allocations,
        },
        ...(u.role === "finance"
          ? [
              {
                title: "What remains in the pilot budget?",
                value: `$${(sum(budgets, "planned") - sum(budgets, "actual")).toLocaleString("en-US")}`,
                explanation: `USD planned (${sum(budgets, "planned")}) − actual (${sum(budgets, "actual")}). Negative means overspend.`,
                sources: budgets,
              },
            ]
          : []),
      ],
    };
  }
  @Get("audit") async audits(@Req() req: Request) {
    const u = await this.user(req);
    const { rows } = await this.db.pool.query(
      "SELECT a.*,u.name AS actor FROM audit a JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 500",
    );
    return rows.filter(
      (r) =>
        u.role === "finance" ||
        (u.role === "lead" &&
          r.team_id === u.team_id &&
          !r.action.includes("budget")) ||
        r.actor_id === u.id,
    );
  }
}
@Module({ controllers: [Api], providers: [Database] })
class App {}
async function bootstrap() {
  const app = await NestFactory.create(App);
  app.use(helmet());
  app.use((req: Request, res: Response, next: () => void) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin &&
      req.headers.origin !== process.env.WEB_ORIGIN
    ) {
      res.status(403).json({ message: "Origin not allowed" });
      return;
    }
    next();
  });
  app.enableCors({
    origin: process.env.WEB_ORIGIN || "http://localhost:3000",
    credentials: true,
  });
  app.enableShutdownHooks();
  await app.listen(Number(process.env.API_PORT || 4000), "0.0.0.0");
}
void bootstrap();
