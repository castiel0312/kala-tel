import { NavLink, Outlet } from "react-router-dom";
import { api, useApi } from "../api/client";

const NAV = [
  { to: "/", label: "Wells", end: true },
  { to: "/quality", label: "Data quality" },
];

export function Layout() {
  const dq = useApi((s) => api.dataQuality(s), []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-name">NWIS</span>
          <span className="brand-sub">FORGE 16B(78)-32</span>
        </div>
        <nav>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              {...(n.end !== undefined ? { end: n.end } : {})}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="version">
          {dq.status === "ready" ? (
            <>
              <span className="pill" data-state={dq.data.state}>
                {dq.data.state}
              </span>
              <code>{dq.data.dataset_version}</code>
            </>
          ) : (
            <code>…</code>
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer>
        <p>
          All populated records are <code>PUBLIC_REAL</code>. Values shown as
          Unavailable are absent from the source, not zero and not estimated.
        </p>
      </footer>
    </div>
  );
}
