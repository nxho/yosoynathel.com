import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Calendar, Clock } from "lucide-react";

interface BlogPost {
  title: string;
  excerpt: string;
  author: "nath" | "rosh";
  publishDate: string;
  readTime: string;
  tags: string[];
}

const blogPosts: BlogPost[] = [
  {
    title: "Building a Design System from Scratch",
    excerpt:
      "Our journey creating a cohesive design language across all our projects. What we learned about consistency, scalability, and the importance of documentation.",
    author: "rosh",
    publishDate: "Oct 3, 2024",
    readTime: "8 min",
    tags: ["Design", "Frontend", "Process"],
  },
  {
    title: "The Art of Side Projects",
    excerpt:
      "Why side projects matter more than your day job for growth, learning, and finding your creative voice. Plus, how we balance ambition with sustainability.",
    author: "nath",
    publishDate: "Sep 28, 2024",
    readTime: "5 min",
    tags: ["Career", "Creativity", "Growth"],
  },
  {
    title: "Collaborative Coding: Lessons from Building Together",
    excerpt:
      "What we've learned from pair programming, code reviews, and shared ownership. The good, the challenging, and the surprisingly rewarding.",
    author: "nath",
    publishDate: "Sep 15, 2024",
    readTime: "6 min",
    tags: ["Collaboration", "Development", "Teamwork"],
  },
  {
    title: "Coffee Shop Chronicles: Remote Work Reflections",
    excerpt:
      "Musings on productivity, creativity, and community in the age of distributed work. Plus our ranking of local coffee shops by WiFi quality.",
    author: "rosh",
    publishDate: "Sep 8, 2024",
    readTime: "4 min",
    tags: ["Remote Work", "Lifestyle", "Productivity"],
  },
];

export function BlogSection() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Latest Thoughts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-80 overflow-y-auto">
        {blogPosts.map((post, index) => (
          <article
            key={index}
            className="border border-border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
          >
            <div className="space-y-2">
              <h3 className="font-medium hover:text-primary cursor-pointer transition-colors">
                {post.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {post.excerpt}
              </p>
            </div>

            <div className="flex flex-wrap gap-1">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>by {post.author}</span>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {post.publishDate}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {post.readTime} read
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-auto p-0 hover:bg-transparent hover:text-primary"
              >
                Read more →
              </Button>
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
