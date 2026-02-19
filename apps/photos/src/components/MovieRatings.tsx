"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Star } from "lucide-react";

interface Movie {
  title: string;
  year: number;
  rating: number;
  genre: string;
  review?: string;
  reviewer: "nath" | "rosh";
}

const movies: Movie[] = [
  {
    title: "Everything Everywhere All at Once",
    year: 2022,
    rating: 5,
    genre: "Sci-Fi",
    review: "Mind-bending and emotional. Perfect blend of chaos and heart.",
    reviewer: "nath",
  },
  {
    title: "The Grand Budapest Hotel",
    year: 2014,
    rating: 4.5,
    genre: "Comedy",
    review: "Wes Anderson's visual storytelling at its finest.",
    reviewer: "rosh",
  },
  {
    title: "Dune",
    year: 2021,
    rating: 4,
    genre: "Sci-Fi",
    review: "Stunning visuals, looking forward to Part Two.",
    reviewer: "nath",
  },
  {
    title: "Parasite",
    year: 2019,
    rating: 5,
    genre: "Thriller",
    review: "Masterclass in social commentary and tension.",
    reviewer: "rosh",
  },
  {
    title: "The French Dispatch",
    year: 2021,
    rating: 3.5,
    genre: "Comedy",
    review: "Beautiful anthology, maybe too stylized?",
    reviewer: "nath",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : star - 0.5 <= rating
              ? "fill-yellow-400/50 text-yellow-400"
              : "text-muted-foreground"
          }`}
        />
      ))}
      <span className="text-sm text-muted-foreground ml-1">{rating}/5</span>
    </div>
  );
}

export function MovieRatings() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Movie Ratings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-80 overflow-y-auto">
        {movies.map((movie, index) => (
          <div
            key={index}
            className="border border-border rounded-lg p-3 space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium">{movie.title}</h4>
                <p className="text-sm text-muted-foreground">({movie.year})</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{movie.genre}</Badge>
                <Badge
                  variant={movie.reviewer === "nath" ? "default" : "outline"}
                >
                  {movie.reviewer}
                </Badge>
              </div>
            </div>
            <StarRating rating={movie.rating} />
            {movie.review && (
              <p className="text-sm text-muted-foreground italic">
                "{movie.review}"
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
