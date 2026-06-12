import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Flock" },
      { name: "description", content: "Sign in or create your Flock poultry farm account." },
    ],
  }),
  component: AuthPlaceholder,
});

function AuthPlaceholder() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-flock-cream px-4">
      <div className="w-full max-w-sm rounded-lg border bg-flock-fog p-6 text-center shadow-flock">
        <h1 className="font-display text-2xl text-flock-soil">Welcome to Flock</h1>
        <p className="mt-2 font-sans text-[14px] text-flock-stone">
          Accounts and onboarding arrive in the next phase. The landing page and
          RationPro are live now.
        </p>
        <Link
          to="/"
          className="mt-5 inline-block rounded-lg bg-flock-harvest px-4 py-2 font-sans text-[14px] font-semibold text-flock-soil"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
