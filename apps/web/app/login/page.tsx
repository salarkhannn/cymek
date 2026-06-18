"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../lib/auth";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { Card } from "../../components/ui/Card";

function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-section">
      <Card variant="cream" className="p-8">
        <h1 className="text-h2 text-ink mb-6 text-center">Log in</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <TextInput
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && (
            <p className="text-caption text-error text-center">{error}</p>
          )}

          <Button type="submit" variant="primary" disabled={pending} className="w-full">
            {pending ? "Logging in..." : "Log in"}
          </Button>
        </form>

        <p className="text-body-sm text-steel text-center mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary hover:text-primary-deep">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default LoginPage;
