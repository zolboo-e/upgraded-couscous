import { createFactory } from "hono/factory";

type AppEnv = {
  Variables: {
    userId: string;
    userEmail: string;
    sessionToken: string;
    companyId?: string;
    isAdmin?: boolean;
  };
};

export const factory = createFactory<AppEnv>();

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    userEmail: string;
    sessionToken: string;
    companyId: string;
    isAdmin: boolean;
  }
}
