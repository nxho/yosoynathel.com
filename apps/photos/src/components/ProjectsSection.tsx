import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ExternalLink, Github } from "lucide-react";

const projects = [
  {
    name: "Cardamom",
    description: "A spice trading platform connecting local farmers with global markets",
    link: "#",
    github: "#",
    status: "Live"
  },
  {
    name: "YumLog",
    description: "Food diary app with AI-powered nutrition tracking and recipe suggestions",
    link: "#", 
    github: "#",
    status: "Beta"
  },
  {
    name: "Podcast Jukebox",
    description: "Collaborative playlist maker for podcast episodes with friends",
    link: "#",
    github: "#", 
    status: "In Development"
  }
];

export function ProjectsSection() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Our Projects</CardTitle>
        <CardDescription>Things we've been building together</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.map((project) => (
          <div key={project.name} className="border border-border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{project.name}</h3>
              <span className="text-sm text-muted-foreground px-2 py-1 bg-muted rounded">
                {project.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{project.description}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <a href={project.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Visit
                </a>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={project.github} target="_blank" rel="noopener noreferrer">
                  <Github className="w-3 h-3 mr-1" />
                  Code
                </a>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}