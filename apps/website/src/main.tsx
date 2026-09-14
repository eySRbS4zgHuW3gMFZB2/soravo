import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Website } from "./website";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");

createRoot(root).render(<StrictMode><Website /></StrictMode>);
