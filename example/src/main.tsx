import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import { DocsShell } from "./components/docs/DocsShell";
import { PlaygroundLocaleProvider } from "./i18n/playground-locale";
import "./styles.css";
import "../../styles.css";

function App() {
  return (
    <PlaygroundLocaleProvider>
      <BrowserRouter>
        <DocsShell />
      </BrowserRouter>
    </PlaygroundLocaleProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
