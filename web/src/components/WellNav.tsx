import { NavLink } from "react-router-dom";

const TABS = [
  { to: "", label: "Overview", end: true },
  { to: "/trajectory", label: "Trajectory", end: false },
  { to: "/timeline", label: "Drilling parameters", end: false },
  { to: "/events", label: "Events", end: false },
  { to: "/documents", label: "Documents", end: false },
];

/** Secondary navigation shared by every well-scoped page. */
export function WellNav({ wellId }: { wellId: string }) {
  return (
    <nav className="subnav">
      {TABS.map((t) => (
        <NavLink
          key={t.label}
          to={`/wells/${wellId}${t.to}`}
          {...(t.end !== undefined ? { end: t.end } : {})}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
