import "reflect-metadata";
import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Query,
  ConflictException,
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
import { canRead, canManage, canEditRecord, money, User } from "./policy";

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
      "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=$1 AND s.expires_at>now() AND u.archived_at IS NULL",
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
        "SELECT id,name,role,title FROM users WHERE archived_at IS NULL ORDER BY name",
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
      "SELECT id FROM users WHERE id=$1 AND archived_at IS NULL",
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
  @Get("workspace") async workspace(
    @Req() req: Request,
    @Query("archived") archived?: string,
  ) {
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
      records: records.rows.filter(
        (r) =>
          canRead(u, r.visibility, r.team_id) &&
          (!r.archived_at || (archived === "true" && canEditRecord(u, r))),
      ),
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
    if (
      !rows[0] ||
      !canRead(u, rows[0].visibility, rows[0].team_id) ||
      (rows[0].archived_at && !canEditRecord(u, rows[0]))
    )
      throw new NotFoundException();
    return rows[0];
  }
  async activeTeam(c: PoolClient, id: string) {
    if (
      !(
        await c.query(
          "SELECT id FROM teams WHERE id=$1 AND archived_at IS NULL FOR SHARE",
          [id],
        )
      ).rowCount
    )
      throw new BadRequestException("Choose an active team");
  }
  async recordValues(c: PoolClient, u: User, b: any, previous?: any) {
    const kind = previous?.kind || b.kind;
    if (!["post", "recognition", "goal", "allocation", "budget"].includes(kind))
      throw new BadRequestException("Unknown module");
    const team = b.teamId ?? previous?.team_id ?? u.team_id;
    await this.activeTeam(c, team);
    if (u.role !== "root") {
      if (kind === "budget" && u.role !== "finance")
        throw new ForbiddenException("Finance access required");
      if (["goal", "allocation"].includes(kind) && !canManage(u, team))
        throw new ForbiddenException("You cannot manage this team");
      if (["post", "recognition"].includes(kind) && team !== u.team_id)
        throw new ForbiddenException("Publish to your own team");
    }
    const title = text(b.title ?? previous?.title, 140),
      body = text(b.body ?? previous?.body);
    const visibility =
      kind === "budget"
        ? "finance"
        : (b.visibility ?? previous?.visibility ?? "company");
    if (
      !["company", "team", "finance"].includes(visibility) ||
      (kind !== "budget" && visibility === "finance")
    )
      throw new BadRequestException("Invalid visibility");
    const old = previous?.data || {};
    const value = (key: string, fallback: unknown) =>
      b[key] ?? old[key] ?? fallback;
    const amount = (key: string, fallback: number) => {
      try {
        return money(value(key, fallback));
      } catch (e) {
        throw new BadRequestException((e as Error).message);
      }
    };
    let data: any = {};
    if (kind === "recognition") {
      const recipient = value("recipient", null);
      if (
        !(
          await c.query(
            "SELECT id FROM users WHERE id=$1 AND archived_at IS NULL FOR SHARE",
            [recipient],
          )
        ).rowCount ||
        recipient === (previous?.owner_id ?? u.id)
      )
        throw new BadRequestException(
          "Choose an active colleague other than the author",
        );
      data = { recipient, badge: "Collaboration" };
    }
    if (kind === "goal") {
      const progress = amount("progress", 0);
      if (progress > 100)
        throw new BadRequestException("Progress must be 0–100");
      data = {
        progress,
        target: text(value("target", ""), 200),
        evidence: text(value("evidence", "No evidence recorded yet"), 1000),
      };
    }
    if (kind === "allocation")
      data = {
        hours: amount("hours", 4),
        capacity: amount("capacity", 0),
        needed: amount("needed", 8),
      };
    if (kind === "budget")
      data = {
        planned: amount("planned", 0),
        actual: amount("actual", 0),
        driver: text(value("driver", "Awaiting finance entry"), 1000),
        currency: "USD",
      };
    return { title, body, team_id: team, visibility, kind, data };
  }
  @Post("records") async create(@Req() req: Request, @Body() b: any) {
    const u = await this.user(req);
    return this.db.transaction(async (c) => {
      const r = await this.recordValues(c, u, b);
      const id = randomUUID();
      const { rows } = await c.query(
        "INSERT INTO records(id,kind,title,body,team_id,visibility,owner_id,data) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
        [
          id,
          r.kind,
          r.title,
          r.body,
          r.team_id,
          r.visibility,
          u.id,
          JSON.stringify(r.data),
        ],
      );
      await this.audit(c, u, "create " + r.kind, id, r.team_id, {
        after: rows[0],
      });
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
      const old = (
        await c.query("SELECT * FROM records WHERE id=$1 FOR UPDATE", [id])
      ).rows[0];
      if (!old || !canRead(u, old.visibility, old.team_id))
        throw new NotFoundException();
      if (!canEditRecord(u, old))
        throw new ForbiddenException("You cannot edit this record");
      if (old.archived_at)
        throw new ConflictException("Restore this record before editing");
      const r = await this.recordValues(c, u, b, old);
      const { rows } = await c.query(
        "UPDATE records SET title=$1,body=$2,team_id=$3,visibility=$4,data=$5,updated_at=now() WHERE id=$6 RETURNING *",
        [r.title, r.body, r.team_id, r.visibility, JSON.stringify(r.data), id],
      );
      await this.audit(c, u, "update " + r.kind, id, r.team_id, {
        before: old.data,
        after: r.data,
        beforeRecord: old,
        afterRecord: rows[0],
      });
      return rows[0];
    });
  }
  @Post("records/:id/archive") async archiveRecord(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    return this.recordArchive(req, id, true);
  }
  @Post("records/:id/restore") async restoreRecord(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    return this.recordArchive(req, id, false);
  }
  async recordArchive(req: Request, id: string, archive: boolean) {
    const u = await this.user(req);
    return this.db.transaction(async (c) => {
      const r = (
        await c.query("SELECT * FROM records WHERE id=$1 FOR UPDATE", [id])
      ).rows[0];
      if (!r || !canRead(u, r.visibility, r.team_id))
        throw new NotFoundException();
      if (!canEditRecord(u, r))
        throw new ForbiddenException("You cannot archive this record");
      if (!archive) await this.activeTeam(c, r.team_id);
      if (Boolean(r.archived_at) === archive) return { ok: true };
      await c.query(
        "UPDATE records SET archived_at=$1,updated_at=now() WHERE id=$2",
        [archive ? new Date() : null, id],
      );
      await this.audit(
        c,
        u,
        (archive ? "archive " : "restore ") + r.kind,
        id,
        r.team_id,
        {
          before: r,
          after: {
            ...r,
            archived_at: archive ? new Date().toISOString() : null,
          },
        },
      );
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
      if (
        !r ||
        r.archived_at ||
        r.kind !== "allocation" ||
        !canRead(u, r.visibility, r.team_id)
      )
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
      await this.audit(c, u, "update own expertise", u.id, u.team_id, {
        before: { skills: u.skills },
        after: { skills },
      });
      return { ok: true };
    });
  }
  @Post("teams/:id/follow") async follow(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    const u = await this.user(req);
    return this.db.transaction(async (c) => {
      await this.activeTeam(c, id);
      await c.query(
        "SELECT id FROM users WHERE id=$1 AND archived_at IS NULL FOR UPDATE",
        [u.id],
      );
      const result = await c.query(
        "DELETE FROM follows WHERE user_id=$1 AND team_id=$2 RETURNING *",
        [u.id, id],
      );
      if (!result.rowCount)
        await c.query("INSERT INTO follows VALUES($1,$2)", [u.id, id]);
      await this.audit(
        c,
        u,
        result.rowCount ? "unfollow team" : "follow team",
        id,
        id,
      );
      return { following: !result.rowCount };
    });
  }
  async root(req: Request) {
    const u = await this.user(req);
    if (u.role !== "root") throw new ForbiddenException("Root access required");
    return u;
  }
  skills(value: unknown) {
    if (!Array.isArray(value) || value.length > 12)
      throw new BadRequestException("Maximum 12 skills");
    return [...new Set(value.map((s) => text(s, 40)))];
  }
  @Post("people") async createPerson(@Req() req: Request, @Body() b: any) {
    return this.savePerson(req, b);
  }
  @Patch("people/:id") async updatePerson(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() b: any,
  ) {
    return this.savePerson(req, b, id);
  }
  async savePerson(req: Request, b: any, id?: string) {
    const u = await this.root(req);
    return this.db.transaction(async (c) => {
      const old = id
        ? (await c.query("SELECT * FROM users WHERE id=$1 FOR UPDATE", [id]))
            .rows[0]
        : null;
      if (id && !old) throw new NotFoundException();
      if (old?.archived_at)
        throw new ConflictException("Restore this person before editing");
      const name = text(b.name ?? old?.name, 100),
        title = text(b.title ?? old?.title, 100),
        role = b.role ?? old?.role ?? "employee",
        team = b.teamId ?? old?.team_id ?? u.team_id;
      if (!["root", "finance", "lead", "employee"].includes(role))
        throw new BadRequestException("Invalid role");
      if (id === u.id && role !== "root")
        throw new BadRequestException(
          "Use another root account to change your own role",
        );
      const skills = this.skills(b.skills ?? old?.skills ?? []);
      await this.activeTeam(c, team);
      const key = id || randomUUID();
      const { rows } = await c.query(
        "INSERT INTO users(id,name,title,role,team_id,skills) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET name=$2,title=$3,role=$4,team_id=$5,skills=$6 RETURNING *",
        [key, name, title, role, team, skills],
      );
      if (old && (old.role !== role || old.team_id !== team))
        await c.query("DELETE FROM sessions WHERE user_id=$1 AND user_id<>$2", [
          key,
          u.id,
        ]);
      await this.audit(
        c,
        u,
        (id ? "update" : "create") + " person",
        key,
        team,
        { before: old, after: rows[0] },
      );
      return rows[0];
    });
  }
  @Post("people/:id/archive") async archivePerson(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    return this.personArchive(req, id, true);
  }
  @Post("people/:id/restore") async restorePerson(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    return this.personArchive(req, id, false);
  }
  async personArchive(req: Request, id: string, archive: boolean) {
    const u = await this.root(req);
    if (id === u.id && archive)
      throw new BadRequestException(
        "You cannot archive your active root account",
      );
    return this.db.transaction(async (c) => {
      const old = (
        await c.query("SELECT * FROM users WHERE id=$1 FOR UPDATE", [id])
      ).rows[0];
      if (!old) throw new NotFoundException();
      if (!archive) await this.activeTeam(c, old.team_id);
      await c.query("UPDATE users SET archived_at=$1 WHERE id=$2", [
        archive ? new Date() : null,
        id,
      ]);
      if (archive) await c.query("DELETE FROM sessions WHERE user_id=$1", [id]);
      await this.audit(
        c,
        u,
        (archive ? "archive" : "restore") + " person",
        id,
        old.team_id,
        {
          before: old,
          after: {
            ...old,
            archived_at: archive ? new Date().toISOString() : null,
          },
        },
      );
      return { ok: true };
    });
  }
  @Post("teams") async createTeam(@Req() req: Request, @Body() b: any) {
    return this.saveTeam(req, b);
  }
  @Patch("teams/:id") async updateTeam(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() b: any,
  ) {
    return this.saveTeam(req, b, id);
  }
  async saveTeam(req: Request, b: any, id?: string) {
    const u = await this.root(req);
    return this.db.transaction(async (c) => {
      const old = id
        ? (await c.query("SELECT * FROM teams WHERE id=$1 FOR UPDATE", [id]))
            .rows[0]
        : null;
      if (id && !old) throw new NotFoundException();
      if (old?.archived_at)
        throw new ConflictException("Restore this team before editing");
      const key = id || randomUUID(),
        name = text(b.name ?? old?.name, 100),
        mission = text(b.mission ?? old?.mission, 1000);
      const { rows } = await c.query(
        "INSERT INTO teams(id,name,mission) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET name=$2,mission=$3 RETURNING *",
        [key, name, mission],
      );
      await this.audit(c, u, (id ? "update" : "create") + " team", key, key, {
        before: old,
        after: rows[0],
      });
      return rows[0];
    });
  }
  @Post("teams/:id/archive") async archiveTeam(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    return this.teamArchive(req, id, true);
  }
  @Post("teams/:id/restore") async restoreTeam(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    return this.teamArchive(req, id, false);
  }
  async teamArchive(req: Request, id: string, archive: boolean) {
    const u = await this.root(req);
    return this.db.transaction(async (c) => {
      const old = (
        await c.query("SELECT * FROM teams WHERE id=$1 FOR UPDATE", [id])
      ).rows[0];
      if (!old) throw new NotFoundException();
      if (archive) {
        const used = await c.query(
          "SELECT id FROM users WHERE team_id=$1 AND archived_at IS NULL UNION ALL SELECT id FROM records WHERE team_id=$1 AND archived_at IS NULL LIMIT 1",
          [id],
        );
        if (used.rowCount)
          throw new ConflictException(
            "Reassign or archive active people and records before archiving this team",
          );
      }
      await c.query("UPDATE teams SET archived_at=$1 WHERE id=$2", [
        archive ? new Date() : null,
        id,
      ]);
      await this.audit(
        c,
        u,
        (archive ? "archive" : "restore") + " team",
        id,
        id,
        {
          before: old,
          after: {
            ...old,
            archived_at: archive ? new Date().toISOString() : null,
          },
        },
      );
      return { ok: true };
    });
  }
  @Get("insights") async insights(@Req() req: Request) {
    const u = await this.user(req);
    const all = (
      await this.db.pool.query(
        "SELECT * FROM records WHERE archived_at IS NULL AND kind IN ('goal','budget','allocation') ORDER BY title",
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
        ...(["finance", "root"].includes(u.role)
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
        ["finance", "root"].includes(u.role) ||
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
