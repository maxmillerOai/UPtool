import { Copy, Hexagon, Lock, Moon, Rocket, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface TopToolbarProps {
  isLight: boolean;
  onToggleTheme: (light: boolean) => void;
  onGenerate?: () => void;
  onCopy?: () => void;
}

const credentialHosts = [
  "Keep2Share",
  "FileBoom",
  "FileJoker",
  "Rapidgator",
  "ImageTwist",
];

export function TopToolbar({
  isLight,
  onToggleTheme,
  onGenerate,
  onCopy,
}: TopToolbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[rgba(0,191,255,0.14)] bg-[rgba(5,15,32,0.65)] px-5 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(0,191,255,0.35)] bg-[rgba(0,191,255,0.08)] shadow-[0_0_16px_-2px_rgba(0,212,255,0.6)]">
          <Hexagon className="h-5 w-5 text-cyber-cyan" strokeWidth={2.2} />
          <span className="absolute h-1.5 w-1.5 rounded-full bg-cyber-cyan shadow-[0_0_8px_1px_rgba(0,212,255,0.9)]" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground neon-text">
          Host Post Builder
        </h1>
      </div>

      <div className="flex items-center gap-2.5">
        <Button variant="primary" size="default" onClick={onGenerate}>
          <Rocket className="h-4 w-4" />
          Generate Post
        </Button>

        <Button variant="outline" onClick={onCopy}>
          <Copy className="h-4 w-4" />
          Copy Post
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Lock className="h-4 w-4 text-cyber-cyan/80" />
              Credentials
              <svg
                className="h-3.5 w-3.5 opacity-70"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Host Credentials</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {credentialHosts.map((host) => (
              <DropdownMenuItem key={host} checked>
                {host}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem>Manage credentials…</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-1 flex items-center gap-2 rounded-md border border-[rgba(0,191,255,0.18)] bg-[rgba(11,22,46,0.5)] px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {isLight ? (
              <Sun className="h-4 w-4 text-cyber-orange" />
            ) : (
              <Moon className="h-4 w-4 text-cyber-cyan" />
            )}
            {isLight ? "Light" : "Dark"}
          </span>
          <Switch checked={isLight} onCheckedChange={onToggleTheme} aria-label="Toggle theme" />
        </div>

        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(0,191,255,0.35)] bg-gradient-to-br from-cyber-cyan/30 to-cyber-blue/10 text-sm font-semibold text-cyan-200"
          )}
        >
          A
        </div>
      </div>
    </header>
  );
}
