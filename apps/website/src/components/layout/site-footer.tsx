import { Link } from "react-router";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <>
      <nav className="legal" aria-label="Legal and account links">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/refund">Refund &amp; cancellation</Link>
        <Link to="/support">Support</Link>
        <Link to="/login">Account</Link>
      </nav>
      <footer>© {year} Soravo. Local-first dictation.</footer>
    </>
  );
}