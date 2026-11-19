import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { Briefcase, Building2, LayoutDashboard, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/employer")({
  beforeLoad: async ({ context }) => {
    const ctx = context as { user?: { id: string } };
    if (!ctx.user) throw redirect({ to: "/dashboard" });
    const { data } = await supabase.rpc("has_role", { _user_id: ctx.user.id, _role: "employer" });
    if (!data) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Employer workspace — NexaTalent" }, { name: "description", content: "Manage your company, vacancies and applicants." }, { name: "robots", content: "noindex" }] }),
  component: EmployerLayout,
});

const nav = [
  { to: "/employer", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/employer/company", label: "Company", icon: Building2 },
  { to: "/employer/vacancies", label: "Vacancies", icon: Briefcase },
  { to: "/employer/applicants", label: "Applicants", icon: Users },
] as const;

function EmployerLayout() {
  return (
    <div className="container-site grid gap-8 py-10 lg:grid-cols-[13rem_1fr]">
      <nav aria-label="Employer workspace" className="flex gap-1 overflow-x-auto lg:flex-col">
        <p className="eyebrow mb-2 hidden text-muted-foreground lg:block">Employer workspace</p>
        {nav.map(({ to, label, icon: Icon, ...rest }) => (
          <Link key={to} to={to} activeOptions={{ exact: "exact" in rest }} className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm text-foreground/75 hover:bg-muted" activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary" }}>
            <Icon className="h-4 w-4" />{label}
          </Link>
        ))}
      </nav>
      <div className="min-w-0"><Outlet /></div>
    </div>
  );
}
