import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WellRiskPanel } from "./components/well-risk";
import "./components/well-risk/WellRiskGauge.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");

createRoot(rootElement).render(
  <StrictMode>
    <main className="wrg-preview"><WellRiskPanel /></main>
  </StrictMode>,
);
