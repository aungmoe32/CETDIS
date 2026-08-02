"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { events } from "@/drizzle/schema";
import { redirect } from "next/navigation";

interface ActionResult {
  error?: string;
}

export async function createEventAction(
  formData: FormData,
): Promise<ActionResult | void> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const title = formData.get("title") as string;
  const dateTime = formData.get("date_time") as string;
  const location = formData.get("location") as string;
  const maxCapacity = parseInt(formData.get("max_capacity") as string, 10);

  if (!title || !dateTime || !maxCapacity) {
    return { error: "Title, date/time, and capacity are required" };
  }

  if (isNaN(maxCapacity) || maxCapacity <= 0) {
    return { error: "Invalid capacity" };
  }

  await db.insert(events).values({
    title,
    dateTime: new Date(dateTime),
    location: location || null,
    maxCapacity,
    organizerId: user.id,
  });

  redirect("/dashboard");
}
