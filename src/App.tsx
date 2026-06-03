import { useEffect, useState } from "react";
import Dashboard from "@/pages/Dashboard";

export default function App() {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", isLight);
    root.classList.toggle("dark", !isLight);
  }, [isLight]);

  return (
    <div className="cyber-gradient min-h-screen text-foreground">
      <Dashboard isLight={isLight} onToggleTheme={setIsLight} />
    </div>
  );
}
