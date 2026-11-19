import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { Briefcase, ClipboardList, Inbox, LayoutDashboard, LogOut, Megaphone, Send, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/staff")({
  beforeLoad: async ({ context }) => {
    const ctx = context as { user?: { id: string } };
    if (!ctx.user) throw redirect({ to: "/dashboard" });
    const { data } = await supabase.rpc("is_staff", { _user_id: ctx.user.id });
    if (!data) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Recruitment CRM — NexaTalent" }, { name: "robots", content: "noindex" }] }),
  component: StaffLayout,
});

const nav = [
  { to: "/staff", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/staff/jobs", label: "Jobs", icon: Briefcase },
  { to: "/staff/applications", label: "Applications", icon: ClipboardList },
  { to: "/staff/candidates", label: "Candidates", icon: Users },
  { to: "/staff/outreach", label: "Outreach", icon: Megaphone },
  { to: "/staff/opportunities", label: "Opportunities", icon: Send },
  { to: "/staff/enquiries", label: "Enquiries", icon: Inbox },
  { to: "/staff/assessments", label: "Assessments", icon: ClipboardList },
  { to: "/staff/specialists", label: "Specialists", icon: Users },
  { to: "/staff/services", label: "Referrals & orders", icon: ClipboardList },
  { to: "/staff/recruiters", label: "Recruiters", icon: Users },
  { to: "/staff/finance", label: "Finance", icon: Wallet },
] as const;

function StaffLayout() {
  const { signOut } = useAuth();
  return (
    <div className="container-site grid gap-8 py-10 lg:grid-cols-[13rem_1fr]">
      <nav aria-label="Recruitment CRM" className="flex gap-1 overflow-x-auto lg:flex-col">
        <p className="eyebrow mb-2 hidden text-muted-foreground lg:block">Recruitment CRM</p>
        {nav.map(({ to, label, icon: Icon, ...rest }) => (
          <Link key={to} to={to} activeOptions={{ exact: "exact" in rest }} className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm text-foreground/75 hover:bg-muted" activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary" }}>
            <Icon className="h-4 w-4" />{label}
          </Link>
        ))}
        <Button variant="outline" className="mt-2 shrink-0 lg:mt-4" onClick={() => void signOut()}><LogOut /> Sign out</Button>
      </nav>
      <div className="min-w-0"><Outlet /></div>
    </div>
  );
}
