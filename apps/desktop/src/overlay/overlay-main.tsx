import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OverlayPill } from "./overlay-pill";
import "./overlay.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");

createRoot(root).render(
  <StrictMode>
    <OverlayPill />
  </StrictMode>,
);
