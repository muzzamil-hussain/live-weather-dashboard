import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    ...authTables,

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
    }).index("email", ["email"]),

    userPreferences: defineTable({
      userId: v.string(),
      temperatureUnit: v.union(v.literal("C"), v.literal("F"), v.literal("K")),
      theme: v.union(v.literal("light"), v.literal("dark")),
      location: v.optional(v.string()),
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
      apiKey: v.optional(v.string()),
      themePreset: v.optional(v.union(
        v.literal("sunny"),
        v.literal("cloudy"),
        v.literal("rainy"),
        v.literal("custom")
      )),
      customTheme: v.optional(v.object({
        background: v.optional(v.string()),
        foreground: v.optional(v.string()),
        primary: v.optional(v.string()),
      })),
      searchHistory: v.optional(v.array(v.string())),
    }).index("by_userId", ["userId"]),

    weatherCache: defineTable({
      location: v.string(),
      data: v.string(),
      timestamp: v.number(),
    }).index("by_location", ["location"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;