import "server-only";

import type { DataRepository } from "@/lib/data/repository";
import { isMockMode } from "@/lib/config";
import { mockRepository } from "@/lib/mock/repository";

export async function getRepository(): Promise<DataRepository> {
  if (isMockMode()) {
    return mockRepository;
  }

  const { supabaseRepository } = await import("@/lib/supabase/repository");
  return supabaseRepository;
}
