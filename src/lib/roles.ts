export type Context = "PROFESSIONAL" | "COMPANY" | "ADMIN";

export const CONTEXT_HOME: Record<Context, string> = {
  PROFESSIONAL: "/profissional",
  COMPANY: "/empresa",
  ADMIN: "/admin",
};

export const CONTEXT_LABEL: Record<Context, string> = {
  PROFESSIONAL: "Profissional",
  COMPANY: "Empresa",
  ADMIN: "Admin",
};
