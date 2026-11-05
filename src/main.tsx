import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import FocusNotObscured from "./components/a11y/FocusNotObscured";
import { HelpTipsProvider } from "./components/a11y/HelpTipsPreference";
import "./style.css";
// Depois de style.css: as regras da nova capa prevalecem sobre as antigas.
import "./styles/home.css";
import "./styles/about.css";
import "./styles/ambient.css";
import "./styles/home-sections.css";
import "./styles/editorial.css";
import "./styles/a11y.css";
import "./styles/privacy.css";

ReactDOM.createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <HelpTipsProvider>
        <App />
        <FocusNotObscured />
      </HelpTipsProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
