import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Protection against Node.removeChild crash (common with Google Translate & Extensions)
if (typeof Node !== 'undefined' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function(child: Node) {
    if (child.parentNode !== this) {
      if (console) {
        console.warn('DOM Protection: Attempted to remove a child that does not belong to this parent.', this, child);
      }
      return child;
    }
    return originalRemoveChild.apply(this, arguments as any);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
