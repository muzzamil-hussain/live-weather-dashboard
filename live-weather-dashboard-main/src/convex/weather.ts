import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Store user preferences
export const saveUserPreferences = mutation({
  args: {
    userId: v.string(),
    temperatureUnit: v.union(v.literal("C"), v.literal("F"), v.literal("K")),
    theme: v.union(v.literal("light"), v.literal("dark")),
    location: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    apiKey: v.optional(v.string()),
    // New optional fields
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        temperatureUnit: args.temperatureUnit,
        theme: args.theme,
        location: args.location,
        latitude: args.latitude,
        longitude: args.longitude,
        apiKey: args.apiKey,
        themePreset: args.themePreset,
        customTheme: args.customTheme,
        searchHistory: args.searchHistory,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("userPreferences", {
        userId: args.userId,
        temperatureUnit: args.temperatureUnit,
        theme: args.theme,
        location: args.location,
        latitude: args.latitude,
        longitude: args.longitude,
        apiKey: args.apiKey,
        themePreset: args.themePreset,
        customTheme: args.customTheme,
        searchHistory: args.searchHistory ?? [],
      });
    }
  },
});

// Get user preferences
export const getUserPreferences = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

// Store weather cache
export const cacheWeatherData = mutation({
  args: {
    location: v.string(),
    data: v.string(), // JSON stringified weather data
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("weatherCache")
      .withIndex("by_location", (q) => q.eq("location", args.location))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        data: args.data,
        timestamp: args.timestamp,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("weatherCache", {
        location: args.location,
        data: args.data,
        timestamp: args.timestamp,
      });
    }
  },
});

// Get cached weather data
export const getCachedWeatherData = query({
  args: { location: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("weatherCache")
      .withIndex("by_location", (q) => q.eq("location", args.location))
      .unique();
  },
});