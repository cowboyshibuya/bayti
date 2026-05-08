import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { DataModel } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        const now = Date.now();
        return {
          email: params.email as string,
          name: (params.name as string | undefined) || (params.email as string),
          createdAt: now,
          updatedAt: now,
        };
      },
    }),
  ],
});
