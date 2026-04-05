"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const password = formData.get("password");

  if (typeof password !== "string" || password !== process.env.ADMIN_PASSWORD) {
    redirect("/login?error=invalid-password");
  }

  const cookieStore = await cookies();
  const secureCookie = (process.env.APP_URL ?? "").startsWith("https://");
  cookieStore.set("ce_admin", "authenticated", {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  redirect("/");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("ce_admin");
  redirect("/login");
}
