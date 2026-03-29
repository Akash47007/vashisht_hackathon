"use client";

import { useEffect, useMemo, useState } from "react";
import { clearSession, getSession } from "../lib/session";

export default function SiteHeader() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    setSession(getSession());

    function handleStorage() {
      setSession(getSession());
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("futureyou-session-updated", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("futureyou-session-updated", handleStorage);
    };
  }, []);

  const isLoggedIn = Boolean(session?.userId);

  const navItems = useMemo(() => {
    if (!isLoggedIn) {
      return [
        { href: "/login", label: "Login" },
        { href: "/onboarding", label: "Get Started" },
        { href: "/manual", label: "User Manual" },
        { href: "/finance-guide", label: "Finance Guide" },
        { href: "/investing", label: "Investing Basics" },
      ];
    }

    return [
      { href: "/snapshot", label: "Snapshot" },
      { href: "/contribution", label: "Contributions" },
      { href: "/withdrawals", label: "Withdrawals" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/manual", label: "User Manual" },
      { href: "/learning", label: "Learning" },
      { href: "/finance-guide", label: "Finance Guide" },
      { href: "/investing", label: "Investing Basics" },
    ];
  }, [isLoggedIn]);

  function handleLogout() {
    clearSession();
    window.dispatchEvent(new Event("futureyou-session-updated"));
    window.location.href = "/";
  }

  return (
    <header className="site-header">
      <a className="brand" href="/">
        FutureYou
      </a>

      <nav className="site-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="site-user">
        {isLoggedIn ? (
          <>
            <span className="badge">{session.email}</span>
            <button className="btn secondary" onClick={handleLogout} type="button">
              Logout
            </button>
          </>
        ) : (
          <>
            <a className="btn secondary" href="/login">
              Login
            </a>
            <a className="btn ghost" href="/onboarding">
              Start One-Time Setup
            </a>
          </>
        )}
      </div>
    </header>
  );
}
