import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="login-shell">
      <section className="login-card">
        <p className="eyebrow">Private Access</p>
        <h1>Operator Login</h1>
        <p className="lede">
          Tailscale restricts network access. This password gate protects the app surface on top.
        </p>
        <form action={loginAction} className="login-form">
          <label htmlFor="password">Admin password</label>
          <input id="password" name="password" type="password" required />
          <button type="submit">Enter control panel</button>
        </form>
        {params.error ? <p className="error-text">Invalid password.</p> : null}
      </section>
    </main>
  );
}
