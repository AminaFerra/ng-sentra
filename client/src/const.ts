export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getOAuthLoginUrl = () => {
  return `${window.location.origin}/api/auth/google`;
};

export const getLocalLoginUrl = () => {
  return `${window.location.origin}/api/local-auth/login`;
};

// Re-export for compatibility with other components
export const getLoginUrl = getLocalLoginUrl;
