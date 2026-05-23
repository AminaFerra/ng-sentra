import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

/**
 * Build the Google OAuth callback URL dynamically from the incoming request.
 * This ensures the redirect works correctly whether the user accesses the app
 * via localhost, a Cloudflare Tunnel URL, or a custom domain.
 */
function buildCallbackUrl(req: Request): string {
  // Trust Cloudflare / reverse-proxy headers for the real origin
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  return `${protocol}://${host}/api/auth/google/callback`;
}

export function registerGoogleAuthRoutes(app: Express) {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    console.warn("[GoogleAuth] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set — Google OAuth disabled.");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        // Placeholder — overridden per-request in the /api/auth/google route below
        callbackURL: "http://localhost:3000/api/auth/google/callback",
        scope: ["profile", "email"],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? null;
          const openId = `google_${profile.id}`;
          const name = profile.displayName || email || "Google User";

          await db.upsertUser({
            openId,
            name,
            email,
            loginMethod: "google",
            lastSignedIn: new Date(),
          });

          done(null, { openId, name, email });
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );

  app.use(passport.initialize());

  // Step 1: Redirect user to Google consent screen
  // We dynamically set the callbackURL based on the request origin
  app.get("/api/auth/google", (req: Request, res: Response, next) => {
    const callbackURL = buildCallbackUrl(req);
    console.log("[GoogleAuth] Using callback URL:", callbackURL);
    passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false,
      callbackURL,
    })(req, res, next);
  });

  // Step 2: Google redirects back here with code
  app.get("/api/auth/google/callback", (req: Request, res: Response, next) => {
    const callbackURL = buildCallbackUrl(req);
    passport.authenticate("google", {
      session: false,
      failureRedirect: "/login?error=google_failed",
      callbackURL,
    })(req, res, next);
  }, async (req: Request, res: Response) => {
    try {
      const user = req.user as { openId: string; name: string; email: string | null };

      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (err) {
      console.error("[GoogleAuth] Callback failed:", err);
      res.redirect("/login?error=session_failed");
    }
  });
}
