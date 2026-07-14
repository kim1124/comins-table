import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import { DocsShell } from "./components/docs/DocsShell";
import "./styles.css";
import "../../styles.css";

function App() {
  return (
    <BrowserRouter>
      <DocsShell />
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
