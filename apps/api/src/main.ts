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
  @Post("demo/view-as") async viewAs(
    @Req() req: Request,
    @Body() b: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.user(req);
    if (process.env.DEMO_MODE !== "true") throw new NotFoundException();
    if (
      ![
        "maya",
        "alex",
        "jordan",
        "sam",
        "priya",
        "leo",
        "nina",
        "owen",
        "imani",
        "ella",
        "root",
      ].includes(b.userId)
    )
      throw new BadRequestException("Choose a demo persona");
    const target = (
      await this.db.pool.query(
        "SELECT id FROM users WHERE id=$1 AND archived_at IS NULL",
        [b.userId],
      )
    ).rows[0];
    if (!target) throw new NotFoundException();
    await this.logout(req, res);
    const token = randomBytes(32).toString("hex");
    await this.db.pool.query(
      "INSERT INTO sessions VALUES($1,$2,now()+interval '8 hours')",
      [token, target.id],
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
      demoMode: process.env.DEMO_MODE === "true",
      interests: (
        await this.db.pool.query(
          "SELECT j.record_id,u.id,u.name FROM joins j JOIN users u ON u.id=j.user_id JOIN records r ON r.id=j.record_id WHERE u.archived_at IS NULL AND r.archived_at IS NULL AND (r.owner_id=$1 OR $2='root')",
          [u.id, u.role],
        )
      ).rows,
      engagement: (
        await this.db.pool.query(
          "SELECT t.id, (SELECT count(*)::int FROM follows f JOIN users u ON u.id=f.user_id WHERE f.team_id=t.id AND u.archived_at IS NULL AND u.role<>'root') AS followers FROM teams t WHERE t.archived_at IS NULL",
        )
      ).rows,
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
      const measured =
        b.completed !== undefined ||
        b.total !== undefined ||
        old.total !== undefined;
      const completed = measured ? amount("completed", 0) : undefined;
      const total = measured ? amount("total", 1) : undefined;
      if (measured && (!total || completed! > total))
        throw new BadRequestException(
          "Completed must be no greater than a positive total",
        );
      const progress = measured
        ? Math.round((completed! / total!) * 10000) / 100
        : amount("progress", 0);
      const evidenceDate = text(
        value("evidenceDate", new Date().toISOString().slice(0, 10)),
        10,
      );
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(evidenceDate) ||
        !Number.isFinite(Date.parse(evidenceDate)) ||
        new Date(evidenceDate).toISOString().slice(0, 10) !== evidenceDate
      )
        throw new BadRequestException("Use a valid evidence date");
      if (progress > 100)
        throw new BadRequestException("Progress must be 0–100");
      data = {
        progress,
        ...(measured
          ? {
              completed,
              total,
              unit: text(value("unit", "acceptance checks"), 100),
            }
          : {}),
        evidenceDate,
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
    return this.db.transaction(async (c) => {
      const skills = await this.skills(c, b.skills);
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
  @Get("skills") async skillCatalog(@Req() req: Request) {
    await this.user(req);
    return {
      skills: (
        await this.db.pool.query(
          "SELECT id::text,name FROM skills ORDER BY lower(name),id",
        )
      ).rows,
    };
  }
  async skills(c: PoolClient, value: unknown): Promise<string[]> {
    if (!Array.isArray(value) || value.length > 12)
      throw new BadRequestException("Maximum 12 skills");
    const requested = [...new Set(value.map((s) => text(s, 40).toLowerCase()))];
    const { rows } = await c.query(
      "SELECT name FROM skills WHERE lower(name)=ANY($1::text[]) ORDER BY name",
      [requested],
    );
    if (rows.length !== requested.length)
      throw new BadRequestException("Choose skills from the skills catalog");
    return rows.map((row) => row.name);
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
      const skills = await this.skills(c, b.skills ?? old?.skills ?? []);
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
        "SELECT * FROM records WHERE archived_at IS NULL ORDER BY title",
      )
    ).rows.filter((r) => canRead(u, r.visibility, r.team_id));
    const teamCount = Number(
      (
        await this.db.pool.query(
          "SELECT count(*) FROM teams WHERE archived_at IS NULL",
        )
      ).rows[0].count,
    );
    const goals = all.filter((r) => r.kind === "goal"),
      allocations = all.filter((r) => r.kind === "allocation"),
      budgets = all.filter((r) => r.kind === "budget"),
      updates = all.filter((r) => r.kind === "post");
    const sum = (rows: any[], key: string) =>
      rows.reduce((n, r) => n + Number(r.data[key] || 0), 0);
    const coverage = (rows: any[]) =>
      `${new Set(rows.map((r) => r.team_id)).size} of ${teamCount} active teams represented in visible records. Missing or restricted records are excluded, not treated as zero.`;
    const answer = (
      title: string,
      value: string,
      explanation: string,
      sources: any[],
      arithmetic: string,
    ) => ({
      title,
      value,
      explanation,
      sources,
      arithmetic,
      coverage: coverage(sources),
    });
    const gaps = allocations.map((r) =>
      Math.max(0, Number(r.data.needed) - Number(r.data.capacity)),
    );
    const totalGap = gaps.reduce((a, b) => a + b, 0);
    const evidenceCutoff = Date.now() - 14 * 86400000;
    const stale = goals.filter(
      (r) =>
        !r.data.evidenceDate ||
        Date.parse(r.data.evidenceDate) < evidenceCutoff,
    );
    const recent = updates.filter(
      (r) => Date.parse(r.updated_at) >= Date.now() - 7 * 86400000,
    );
    const goalArithmetic = goals
      .map(
        (r) =>
          `${r.title}: ${r.data.progress}%${r.data.total ? ` (${r.data.completed} / ${r.data.total} ${r.data.unit})` : " (owner estimate)"}`,
      )
      .join("; ");
    return {
      asOf: new Date().toISOString(),
      mode: "Deterministic source-backed summaries; no AI model is called.",
      coverage:
        "All answers respect your current persona’s access. Planning estimates are not individual performance scores.",
      answers: [
        answer(
          "How is our shared work progressing?",
          goals.length
            ? `${Math.round(sum(goals, "progress") / goals.length)}%`
            : "No data",
          `Unweighted average of ${goals.length} visible goals; rounded to the nearest whole percent. Owner-reported evidence.`,
          goals,
          `${goalArithmetic}. (${goals.map((r) => r.data.progress).join(" + ") || "no values"}) ÷ ${goals.length} = ${goals.length ? (sum(goals, "progress") / goals.length).toFixed(2) : "not available"}% before rounding.`,
        ),
        answer(
          "Where do we need more capacity?",
          allocations.length ? `${totalGap} hrs/week` : "No data",
          "Weekly shortfalls are added per opportunity; spare capacity on another opportunity is not assumed transferable. Interest does not commit hours.",
          allocations,
          allocations
            .map(
              (r, i) =>
                `${r.title}: max(${r.data.needed} needed − ${r.data.capacity} available, 0) = ${gaps[i]} hrs`,
            )
            .join("; ") +
            `. Total = ${gaps.join(" + ")} = ${totalGap} hrs/week.`,
        ),
        answer(
          "Which goals need fresh evidence?",
          goals.length ? `${stale.length} of ${goals.length}` : "No data",
          "Goals with missing evidence dates or evidence older than 14 days. This is a documentation prompt, not a judgment of progress.",
          goals,
          goals
            .map(
              (r) =>
                `${r.title}: ${r.data.evidenceDate || "date missing"} — ${stale.includes(r) ? "needs refresh" : "within 14 days"}`,
            )
            .join("; "),
        ),
        answer(
          "Where can colleagues contribute?",
          allocations.length
            ? `${allocations.filter((r, i) => gaps[i] > 0).length} opportunities`
            : "No data",
          "Visible opportunities with positive weekly capacity gaps; colleagues may express interest voluntarily.",
          allocations,
          allocations
            .map(
              (r, i) =>
                `${r.title}: ${gaps[i]} hrs/week gap — ${gaps[i] > 0 ? "open capacity need" : "no shortfall"}`,
            )
            .join("; "),
        ),
        answer(
          "Which teams shared an update this week?",
          `${new Set(recent.map((r) => r.team_id)).size} of ${teamCount} teams`,
          "Teams with a visible update created or edited in the last 7 days. Absence of an update does not mean absence of work.",
          recent,
          recent
            .map((r) => `${r.title}: ${r.updated_at.toISOString()}`)
            .join("; ") || "No visible updates in the last 7 days.",
        ),
        ...(["finance", "root"].includes(u.role)
          ? [
              answer(
                "What remains in the pilot budget?",
                budgets.length
                  ? `$${(sum(budgets, "planned") - sum(budgets, "actual")).toLocaleString("en-US")}`
                  : "No data",
                "USD planned minus actual. Negative means overspend; review the source justification.",
                budgets,
                budgets
                  .map(
                    (r) =>
                      `${r.title}: $${r.data.planned} − $${r.data.actual} = $${r.data.planned - r.data.actual}`,
                  )
                  .join("; ") +
                  `. Total: $${sum(budgets, "planned")} − $${sum(budgets, "actual")} = $${sum(budgets, "planned") - sum(budgets, "actual")}.`,
              ),
            ]
          : []),
      ],
    };
  }
  @Get("audit") async audits(@Req() req: Request) {
    const u = await this.user(req);
    const { rows } = await this.db.pool.query(
      "SELECT a.*,u.name AS actor,CASE WHEN r.id IS NOT NULL THEN initcap(r.kind)||': '||r.title WHEN subject.id IS NOT NULL THEN subject.name||CASE WHEN a.action LIKE '%expertise%' THEN '’s expertise' ELSE ' · profile' END WHEN t.id IS NOT NULL THEN 'Team: '||t.name ELSE 'Workspace activity' END AS record_label FROM audit a JOIN users u ON u.id=a.actor_id LEFT JOIN records r ON r.id=a.record_id LEFT JOIN users subject ON subject.id=a.record_id LEFT JOIN teams t ON t.id=a.record_id ORDER BY a.id DESC LIMIT 500",
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
