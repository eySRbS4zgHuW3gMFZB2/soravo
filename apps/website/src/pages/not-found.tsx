import { Link } from "react-router";
import { PageIntro } from "../components/page-intro";

export function NotFound() {
  return (
    <PageIntro eyebrow="404" title="This page does not exist." lede="The link may be outdated or the page may have moved.">
      <Link className="button" to="/">
        Back to the home page
      </Link>
    </PageIntro>
  );
}