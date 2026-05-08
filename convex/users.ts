import { mutation } from "./_generated/server";
import { requireIdentity } from "./lib/permissions";

export const syncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) =>
        q.eq("email", identity.email),
      )
      .unique();

    const name =
      identity.name ??
      identity.email ??
      identity.preferredUsername ??
      "Family member";

    if (existing) {
      await ctx.db.patch(existing._id, {
        name,
        email: identity.email,
        image: identity.pictureUrl,
        updatedAt: now,
      });

      return existing._id;
    }

    return await ctx.db.insert("users", {
      name,
      email: identity.email,
      image: identity.pictureUrl,
      createdAt: now,
      updatedAt: now,
    });
  },
});
