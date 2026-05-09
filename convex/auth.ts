import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { DataModel } from "./_generated/dataModel";

function cleanEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function cleanSignupName(value: unknown, email: string) {
  const name = String(value ?? "").trim();

  if (name.length === 0) {
    return email;
  }

  if (name.length < 2) {
    throw new Error("Display name must be at least 2 characters.");
  }

  if (name.length > 80) {
    throw new Error("Display name must be 80 characters or fewer.");
  }

  return name;
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        const now = Date.now();
        const email = cleanEmail(params.email);

        if (!email.includes("@")) {
          throw new Error("Enter a valid email.");
        }

        return {
          email,
          name: cleanSignupName(params.name, email),
          createdAt: now,
          updatedAt: now,
        };
      },
    }),
  ],
});
