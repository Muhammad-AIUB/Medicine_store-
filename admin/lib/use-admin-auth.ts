"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { ApiRequestError } from "./api";

/** Wraps admin API calls: a 401 (expired/missing cookie) redirects to /login. */
export function useAdminGuard() {
  const router = useRouter();
  return useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | null> => {
      try {
        return await fn();
      } catch (e: unknown) {
        if (e instanceof ApiRequestError && e.isAuthError) {
          router.push("/login");
          return null;
        }
        throw e;
      }
    },
    [router],
  );
}
