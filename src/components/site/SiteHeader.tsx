import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/use-auth";
import { primaryNav } from "./nav";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={cn("sticky top-0 z-50 border-b transition-colors duration-300", scrolled ? "border-border bg-background/90 backdrop-blur" : "border-transparent bg-background")}>
      <div className="container-site flex h-16 items-center justify-between gap-6">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {primaryNav.map((n) => (
            <Link key={n.to} to={n.to} className="rounded-md px-3 py-2 text-sm font-medium text-foreground/75 transition-colors hover:text-primary" activeProps={{ className: "text-primary" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <Button asChild size="sm" variant="outline"><Link to="/dashboard">My dashboard</Link></Button>
              <Button size="sm" onClick={() => void signOut()}>Sign out</Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign In</Link></Button>
              <Button asChild size="sm" className="bg-primary hover:bg-primary-deep"><Link to="/auth" search={{ mode: "signup" }}>Join the Network</Link></Button>
            </>
          )}
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu"><Menu /></Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 bg-primary-deep text-primary-foreground border-none">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="mt-10 flex flex-col gap-1">
              {primaryNav.map((n) => (
                <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="border-b border-primary-foreground/10 py-3 font-display text-lg">{n.label}</Link>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3">
              {user ? (
                <>
                  <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/dashboard" onClick={() => setOpen(false)}>My dashboard</Link></Button>
                  <Button variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground" onClick={() => { setOpen(false); void signOut(); }}>Sign out</Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground"><Link to="/auth" onClick={() => setOpen(false)}>Sign In</Link></Button>
                  <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/auth" search={{ mode: "signup" }} onClick={() => setOpen(false)}>Join the Network</Link></Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
