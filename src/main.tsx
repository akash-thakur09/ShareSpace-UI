import React from "react";
import ReactDOM from "react-dom/client";
import { AppRoutes } from "./app/routes";
import { TestPage } from "./test-page";
import "./index.css";

// Temporary: Show test page to debug
const showTestPage = false;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {showTestPage ? <TestPage /> : <AppRoutes />}
  </React.StrictMode>
);