import * as Joi from "joi";

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
  PORT: Joi.number().default(3001),

  DATABASE_URL: Joi.string().required(),

  JWT_ACCESS_EXPIRES_IN: Joi.string().default("10m"),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default("30d"),

  JWT_ACCESS_PRIVATE_KEY: Joi.string().required(),
  JWT_ACCESS_PUBLIC_KEY: Joi.string().required(),
  JWT_REFRESH_PRIVATE_KEY: Joi.string().required(),
  JWT_REFRESH_PUBLIC_KEY: Joi.string().required(),

  COOKIE_SECURE: Joi.string().valid("true", "false").default("false"),
  COOKIE_SAMESITE: Joi.string().valid("lax", "strict", "none").default("lax"),
  COOKIE_DOMAIN: Joi.string().allow("").optional(),

  AZURE_SERVICEBUS_CONNECTION_STRING: Joi.string().allow("").optional(),
  AZURE_SERVICEBUS_TOPIC: Joi.string().allow("").optional(),
  AZURE_SERVICEBUS_SUBJECT_PREFIX: Joi.string().allow("").optional()
});