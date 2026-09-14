import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { loadAnalytics } from "./lib/analytics";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");

loadAnalytics();

createRoot(root).render(<StrictMode><App /></StrictMode>);
