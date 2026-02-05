import { normalizePem } from "@common/security/pem";

export default () => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "3001", 10),

  databaseUrl: process.env.DATABASE_URL!,

  jwt: {
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "10m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",

    accessPrivateKey: normalizePem(process.env.JWT_ACCESS_PRIVATE_KEY || ""),
    accessPublicKey: normalizePem(process.env.JWT_ACCESS_PUBLIC_KEY || ""),

    refreshPrivateKey: normalizePem(process.env.JWT_REFRESH_PRIVATE_KEY || ""),
    refreshPublicKey: normalizePem(process.env.JWT_REFRESH_PUBLIC_KEY || "")
  },

  cookies: {
    secure: (process.env.COOKIE_SECURE ?? "false") === "true",
    sameSite: (process.env.COOKIE_SAMESITE ?? "lax") as "lax" | "strict" | "none",
    domain: process.env.COOKIE_DOMAIN || undefined
  },

  serviceBus: {
    connectionString: process.env.AZURE_SERVICEBUS_CONNECTION_STRING || "",
    topic: process.env.AZURE_SERVICEBUS_TOPIC || "spd.events",
    subjectPrefix: process.env.AZURE_SERVICEBUS_SUBJECT_PREFIX || "Auth."
  },

  cosmosDb: {
    endpoint: process.env.COSMOS_DB_ENDPOINT || "https://localhost:8081",
    key: process.env.COSMOS_DB_KEY || "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
    databaseName: process.env.COSMOS_DB_DATABASE || "spd_audit",
    containerName: process.env.COSMOS_DB_CONTAINER || "auth_logs",
    coreContainerName: process.env.COSMOS_DB_CORE_CONTAINER || "core_logs",
    disableSslVerification: process.env.COSMOS_DB_DISABLE_SSL || "true"
  }
});