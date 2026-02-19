// import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Github, Twitter, Mail } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">P</span>
              </div>
              <h1 className="font-medium">The Penthouse</h1>
            </div>
            {/* <Badge variant="secondary" className="text-xs">
              Collaborative Space
            </Badge> */}
          </div>

          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <a href="#" target="_blank" rel="noopener noreferrer">
                <Github className="w-4 h-4" />
              </a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="#" target="_blank" rel="noopener noreferrer">
                <Twitter className="w-4 h-4" />
              </a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="mailto:hello@youandfriend.com">
                <Mail className="w-4 h-4" />
              </a>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
