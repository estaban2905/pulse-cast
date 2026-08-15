import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { setupTizen } from "./tizen";

// Solo hace algo dentro de un televisor Samsung: le enseña a cerrarse con la
// tecla «atrás» del mando. En cualquier otro sitio no toca nada.
setupTizen();

const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<App />);
}
