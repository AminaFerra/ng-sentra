import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getUserByEmail, createAuthAuditLog, upsertUser } from "../db";
import { sdk } from "../_core/sdk";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { ENV } from "../_core/env";
import * as db from "../db";
import { sendEmailOTP } from "../_core/mail";

// Strong password regex: 
// (?=.*[a-z]) : at least one lowercase
// (?=.*[A-Z]) : at least one uppercase
// (?=.*\d)    : at least one number
// (?=.*[\W_]) : at least one special character
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

async function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  let cleanUrl = connectionString;
  let ssl = undefined;
  if (cleanUrl.includes('?ssl=')) {
    const parts = cleanUrl.split('?ssl=');
    cleanUrl = parts[0];
    ssl = { rejectUnauthorized: true };
  }
  const connection = await mysql.createConnection({ uri: cleanUrl, ssl });
  return drizzle(connection);
}

export const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),
  
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().regex(passwordRegex, "Password must be at least 8 characters and include numbers, special characters, uppercase and lowercase letters."),
      name: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const existingUser = await getUserByEmail(input.email);
      if (existingUser) {
        throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const openId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const drizzleDb = await getDb();
      if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB Connection failed" });

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

      await drizzleDb.insert(users).values({
        openId,
        email: input.email,
        name: input.name,
        passwordHash,
        isVerified: false,
        twoFactorEnabled: false,
        role: "Viewer",
        loginMethod: "local",
        otpCode,
        otpExpiresAt,
      });

      // Send actual email OTP
      try {
        await sendEmailOTP(input.email, otpCode, "Registration");
      } catch (err) {
        console.error("Failed to send OTP:", err);
      }

      return { success: true, message: "Registration successful. Please verify email." };
    }),

  verifyEmail: publicProcedure
    .input(z.object({ email: z.string().email(), code: z.string() }))
    .mutation(async ({ input }) => {
      const drizzleDb = await getDb();
      if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      const userList = await drizzleDb.select().from(users).where(eq(users.email, input.email)).limit(1);
      const user = userList[0];

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (user.otpCode !== input.code || !user.otpExpiresAt || new Date(user.otpExpiresAt) < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired verification code" });
      }
      
      await drizzleDb.update(users)
        .set({ isVerified: true, otpCode: null, otpExpiresAt: null })
        .where(eq(users.email, input.email));
      return { success: true };
    }),

  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = await getUserByEmail(input.email);
      const ip = ctx.req?.ip || "Unknown IP";
      const ua = ctx.req?.headers["user-agent"] || "Unknown User Agent";

      if (!user || !user.passwordHash) {
        if (user) await createAuthAuditLog({ userId: user.id, eventType: "LOGIN_FAILED", ipAddress: ip, userAgent: ua });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }

      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        await createAuthAuditLog({ userId: user.id, eventType: "ACCOUNT_LOCKED", ipAddress: ip, userAgent: ua });
        throw new TRPCError({ code: "FORBIDDEN", message: "Account is temporarily locked due to multiple failed attempts" });
      }

      const validPassword = await bcrypt.compare(input.password, user.passwordHash);
      if (!validPassword) {
        await createAuthAuditLog({ userId: user.id, eventType: "LOGIN_FAILED", ipAddress: ip, userAgent: ua });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }

      if (!user.isVerified) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Email not verified" });
      }

      // If user requires 2FA setup or verification
      const tempToken = await sdk.createSessionToken(user.openId, { expiresInMs: 5 * 60 * 1000, name: "temp" });

      if (!user.twoFactorEnabled) {
        return { requires2FASetup: true, tempToken };
      }

      // If they use email OTP for 2FA, generate and send a new OTP now
      if (user.twoFactorType === "email") {
        const drizzleDb = await getDb();
        if (drizzleDb) {
          const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
          const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
          await drizzleDb.update(users).set({ otpCode, otpExpiresAt }).where(eq(users.id, user.id));
          try {
            await sendEmailOTP(user.email!, otpCode, "Login 2FA");
          } catch (err) {
            console.error("Failed to send 2FA OTP:", err);
          }
        }
      }

      return { requires2FA: true, twoFactorType: user.twoFactorType, tempToken };
    }),

  setup2fa: publicProcedure
    .input(z.object({ type: z.enum(["totp", "email"]), tempToken: z.string() }))
    .mutation(async ({ input }) => {
      const session = await sdk.verifySession(input.tempToken);
      if (!session || session.name !== "temp") throw new TRPCError({ code: "UNAUTHORIZED" });
      
      const drizzleDb = await getDb();
      if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      if (input.type === "totp") {
        const secret = speakeasy.generateSecret({ name: "NG-SENTRA SOC" });
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

        await drizzleDb.update(users)
          .set({ twoFactorSecret: secret.base32, twoFactorType: "totp" })
          .where(eq(users.openId, session.openId));

        return { qrCodeUrl, secret: secret.base32 };
      }

      // Email OTP Setup
      await drizzleDb.update(users)
        .set({ twoFactorType: "email", twoFactorEnabled: true })
        .where(eq(users.openId, session.openId));
      return { message: "Email OTP mode selected" };
    }),

  challenge2fa: publicProcedure
    .input(z.object({ tempToken: z.string(), code: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const session = await sdk.verifySession(input.tempToken);
      if (!session || session.name !== "temp") throw new TRPCError({ code: "UNAUTHORIZED" });

      const drizzleDb = await getDb();
      if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userList = await drizzleDb.select().from(users).where(eq(users.openId, session.openId)).limit(1);
      const user = userList[0];
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const ip = ctx.req?.ip || "Unknown IP";
      const ua = ctx.req?.headers["user-agent"] || "Unknown User Agent";

      let isValid = false;
      if (user.twoFactorType === "totp") {
        isValid = speakeasy.totp.verify({ secret: user.twoFactorSecret!, encoding: "base32", token: input.code, window: 1 });
      } else {
        // Real email OTP verification
        if (user.otpCode === input.code && user.otpExpiresAt && new Date(user.otpExpiresAt) > new Date()) {
          isValid = true;
          await drizzleDb.update(users).set({ otpCode: null, otpExpiresAt: null }).where(eq(users.id, user.id));
        }
      }

      if (!isValid) {
        await createAuthAuditLog({ userId: user.id, eventType: "2FA_FAILED", ipAddress: ip, userAgent: ua });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired 2FA code" });
      }

      if (!user.twoFactorEnabled) {
        await drizzleDb.update(users).set({ twoFactorEnabled: true }).where(eq(users.id, user.id));
      }

      await createAuthAuditLog({ userId: user.id, eventType: "LOGIN_SUCCESS", ipAddress: ip, userAgent: ua });

      // Generate actual session token
      const token = await sdk.createSessionToken(user.openId, { name: user.name || "User" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

      return { success: true };
    })
});
