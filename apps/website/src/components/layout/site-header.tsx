import { useState } from "react";
import { Link, NavLink } from "react-router";

const links = [
  { label: "Features", to: "/features" },
  { label: "Pricing", to: "/pricing" },
  { label: "FAQ", to: "/faq" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="Soravo home" onClick={close}>
        <span>◉</span> Soravo
      </Link>
      <button
        className="menu"
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen((current) => !current)}
      >
        Menu
      </button>
      <nav id="site-nav" className={open ? "open" : ""} aria-label="Main navigation">
        {links.map((item) => (
          <NavLink key={item.to} to={item.to} onClick={close}>
            {item.label}
          </NavLink>
        ))}
        <Link className="button small" to="/download" onClick={close}>
          Get Soravo
        </Link>
      </nav>
    </header>
  );
}