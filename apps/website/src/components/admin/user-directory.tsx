import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "../ui/button";
import type { AppSupabaseClient } from "../../lib/supabase";
import {
  DIRECTORY_PAGE_SIZE,
  SEARCH_MAX_LENGTH,
  getAdminDirectory,
  normalizeDirectorySearch,
  type AdminDirectoryUser,
} from "../../lib/admin-users-service";

// WEB-009 admin user directory.
//
// Independent of the aggregate metrics section so a totals failure never hides
// the directory (and vice versa). The backend is the authorization boundary
// (09_SECURITY_BASELINE.md §4): the page only shows what `admin_users` returns,
// never internal ids, provider references, or payment data. Renders a
// server-supplied page of 25 users with forward/back pagination driven by
// has_more / offset. A monotonically increasing request id discards any stale
// response so an older search can never overwrite a newer one.

type LoadKind = "initial" | "search" | "page";

const GENERIC_MESSAGE = "We couldn't load the user directory. Please try again.";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatGeneratedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toISOString().slice(0, 19).replace("T", " ")}Z`;
}

function platformsLabel(platforms: Record<string, number>): string {
  const entries = Object.entries(platforms);
  if (entries.length === 0) return "";
  return entries.map(([platform, count]) => `${platform} ${formatCount(count)}`).join(", ");
}

function statusMessage(kind: LoadKind, search: string | null): string {
  if (kind === "search") return `Searching for "${search}"…`;
  if (kind === "page") return "Loading more users…";
  return "Loading user directory…";
}

export function UserDirectory({ client }: { client: AppSupabaseClient }) {
  const [inputValue, setInputValue] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [users, setUsers] = useState<AdminDirectoryUser[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadKind, setLoadKind] = useState<LoadKind>("initial");
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setLoadKind(offset > 0 ? "page" : submittedSearch !== null ? "search" : "initial");
    getAdminDirectory(client, { search: submittedSearch, offset }).then((result) => {
      if (cancelled || requestId !== requestIdRef.current) return;
      setLoading(false);
      if (result.data) {
        setUsers(result.data.users);
        setHasMore(result.data.has_more);
        setGeneratedAt(result.data.generated_at);
      } else {
        setError(result.error ?? GENERIC_MESSAGE);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [client, submittedSearch, offset, reloadToken]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedSearch(normalizeDirectorySearch(inputValue));
    setOffset(0);
  }

  function handlePreviousPage() {
    if (offset === 0 || loading) return;
    setOffset((current) => Math.max(0, current - DIRECTORY_PAGE_SIZE));
  }

  function handleNextPage() {
    if (!hasMore || loading) return;
    setOffset((current) => current + DIRECTORY_PAGE_SIZE);
  }

  const pageNumber = Math.floor(offset / DIRECTORY_PAGE_SIZE) + 1;
  const status = loading ? statusMessage(loadKind, submittedSearch) : null;

  return (
    <section aria-labelledby="directory-heading">
      <h2 id="directory-heading" className="form-heading">
        User directory
      </h2>
      <p className="form-note">
        Searchable per-user summaries in pages of {formatCount(DIRECTORY_PAGE_SIZE)}. A search
        matches email, display name, or public user ID.
      </p>

      <form className="directory-search" role="search" onSubmit={handleSubmit}>
        <p className="field">
          <label htmlFor="admin-user-search">Search users</label>
          <input
            id="admin-user-search"
            type="search"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            maxLength={SEARCH_MAX_LENGTH}
            autoComplete="off"
            placeholder="Email, public user ID, or display name"
          />
        </p>
        <Button type="submit" disabled={loading}>
          Search
        </Button>
      </form>

      {error ? (
        <div role="alert">
          <p className="form-error">{error}</p>
          <div className="page-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReloadToken((token) => token + 1)}
            >
              Try again
            </Button>
          </div>
        </div>
      ) : null}

      {!error && !loading && users.length === 0 ? (
        <p className="form-note" role="status">
          {submittedSearch ? `No users match "${submittedSearch}".` : "No users found yet."}
        </p>
      ) : null}

      {!error && users.length === 0 ? (
        status ? (
          <p className="form-note" role="status">
            {status}
          </p>
        ) : null
      ) : null}

      {!error && users.length > 0 ? (
        <>
          {status ? (
            <p className="form-note" role="status">
              {status}
            </p>
          ) : null}
          <ul className="directory-list">
            {users.map((user) => (
              <UserRow key={user.public_user_id} user={user} />
            ))}
          </ul>
          <nav className="pagination-row" aria-label="User directory pagination">
            <Button
              type="button"
              variant="outline"
              disabled={offset === 0 || loading}
              onClick={handlePreviousPage}
            >
              Previous page
            </Button>
            <span className="form-note">Page {formatCount(pageNumber)}</span>
            <Button
              type="button"
              variant="outline"
              disabled={!hasMore || loading}
              onClick={handleNextPage}
            >
              Next page
            </Button>
            {hasMore ? <span className="form-note">More results available.</span> : null}
          </nav>
          <p className="form-note">
            Showing {formatCount(users.length)} {users.length === 1 ? "user" : "users"}
            {generatedAt ? ` · Directory generated ${formatGeneratedAt(generatedAt)} (UTC).` : ""}
          </p>
        </>
      ) : null}
    </section>
  );
}

function UserRow({ user }: { user: AdminDirectoryUser }) {
  const platforms = platformsLabel(user.devices.platforms);
  return (
    <li className="directory-user">
      <div className="directory-user-head">
        <strong>{user.display_name ?? user.email ?? "Unnamed user"}</strong>
        <span className="session-id directory-id">{user.public_user_id}</span>
      </div>
      <dl>
        <div className="directory-field">
          <dt>Email</dt>
          <dd>{user.email ?? "—"}</dd>
        </div>
        <div className="directory-field">
          <dt>Display name</dt>
          <dd>{user.display_name ?? "—"}</dd>
        </div>
        <div className="directory-field">
          <dt>Role</dt>
          <dd>{user.role}</dd>
        </div>
        <div className="directory-field">
          <dt>Account status</dt>
          <dd>{user.account_status}</dd>
        </div>
        <div className="directory-field">
          <dt>Created</dt>
          <dd>{formatDate(user.created_at)}</dd>
        </div>
        <div className="directory-field">
          <dt>Last sign-in</dt>
          <dd>{formatDate(user.last_sign_in_at)}</dd>
        </div>
        <div className="directory-field">
          <dt>Plan</dt>
          <dd>{user.entitlement ? user.entitlement.plan : "—"}</dd>
        </div>
        <div className="directory-field">
          <dt>Licence</dt>
          <dd>{user.entitlement ? user.entitlement.status : "—"}</dd>
        </div>
        <div className="directory-field">
          <dt>Devices</dt>
          <dd>
            {user.devices.count > 0
              ? `${user.devices.active}/${user.devices.count} active${platforms ? ` · ${platforms}` : ""}`
              : "No devices"}
          </dd>
        </div>
        <div className="directory-field">
          <dt>Sessions</dt>
          <dd>{user.sessions.count > 0 ? `${user.sessions.active}/${user.sessions.count} active` : "No sessions"}</dd>
        </div>
      </dl>
    </li>
  );
}