import { Header } from "@/components/Header";
import { ProjectsSection } from "@/components/ProjectsSection";
import { PhotoCanvas } from "@/components/PhotoCanvas";
import { MovieRatings } from "@/components/MovieRatings";
import { TwitterFeed } from "@/components/TwitterFeed";
import { BlogSection } from "@/components/BlogSection";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8">
        <PhotoCanvas />
      </main>

      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-muted-foreground">
            {/* <p className="text-sm">
              A collaborative space for sharing projects, memories, and
              thoughts.
            </p>
            <p className="text-xs mt-2">
              Built with love, code, and probably too much coffee ☕️
            </p> */}
          </div>
        </div>
      </footer>
    </div>
  );
}
