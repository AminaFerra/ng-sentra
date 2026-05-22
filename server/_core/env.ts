export const ENV = {
  get appId() {
    return process.env.VITE_APP_ID ?? "";
  },
  get cookieSecret() {
    return process.env.JWT_SECRET ?? "";
  },
  get databaseUrl() {
    return process.env.DATABASE_URL ?? "";
  },
  get oAuthServerUrl() {
    return process.env.OAUTH_SERVER_URL ?? "";
  },
  get ownerOpenId() {
    return process.env.OWNER_OPEN_ID ?? "";
  },
  get localAuthEnabled() {
    return process.env.LOCAL_AUTH_ENABLED !== "false";
  },
  get localAuthOpenId() {
    return process.env.LOCAL_AUTH_OPEN_ID ?? "local-admin";
  },
  get localAuthName() {
    return process.env.LOCAL_AUTH_NAME ?? "Local Admin";
  },
  get localAuthEmail() {
    return process.env.LOCAL_AUTH_EMAIL ?? "admin@localhost";
  },
  get localAuthRole() {
    return process.env.LOCAL_AUTH_ROLE ?? "Admin";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get forgeApiUrl() {
    return process.env.BUILT_IN_FORGE_API_URL ?? "";
  },
  get forgeApiKey() {
    return process.env.BUILT_IN_FORGE_API_KEY ?? "";
  },
};
