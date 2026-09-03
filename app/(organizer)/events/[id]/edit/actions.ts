"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { events } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

interface ActionResult {
  error?: string;
}

export async function updateEventAction(
  eventId: string,
  formData: FormData,
): Promise<ActionResult | void> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string)?.trim() || null;
  const dateTime = formData.get("date_time") as string;
  const location = formData.get("location") as string;
  const maxCapacity = parseInt(formData.get("max_capacity") as string, 10);
  const priceRaw = formData.get("price") as string;
  const price = priceRaw ? parseInt(priceRaw, 10) : 0;

  if (!title || !dateTime || !maxCapacity) {
    return { error: "Title, date/time, and capacity are required" };
  }

  if (isNaN(maxCapacity) || maxCapacity <= 0) {
    return { error: "Invalid capacity" };
  }

  if (isNaN(price) || price < 0) {
    return { error: "Invalid price" };
  }

  // Verify ownership
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.organizerId, user.id)))
    .limit(1);

  if (!event) {
    return { error: "Event not found or unauthorized" };
  }

  await db
    .update(events)
    .set({
      title,
      description,
      dateTime: new Date(dateTime),
      location: location || null,
      maxCapacity,
      price,
    })
    .where(eq(events.id, eventId));

  revalidatePath("/dashboard");
  revalidatePath("/events/all");
  redirect("/dashboard");
}
