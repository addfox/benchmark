import "../../source/styles/index.css";
import { createRoot } from "react-dom/client";
import App from "../../source/space/App";

const root = document.getElementById("app");
if (root) createRoot(root).render(<App />);
