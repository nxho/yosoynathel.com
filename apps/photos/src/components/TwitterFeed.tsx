"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Heart, MessageCircle, Repeat2 } from "lucide-react";

interface Tweet {
  id: string;
  author: "nath" | "rosh";
  content: string;
  timestamp: string;
  likes: number;
  retweets: number;
  replies: number;
}

const tweets: Tweet[] = [
  {
    id: "1",
    author: "nath",
    content:
      "Just shipped a new feature for Cardamom! The farmer dashboard now shows real-time market prices 📈 Small wins that make big differences",
    timestamp: "2h",
    likes: 12,
    retweets: 3,
    replies: 2,
  },
  {
    id: "2",
    author: "rosh",
    content:
      "That moment when your code works on the first try and you're immediately suspicious 🤔 #development",
    timestamp: "4h",
    likes: 47,
    retweets: 8,
    replies: 12,
  },
  {
    id: "3",
    author: "nath",
    content:
      "Coffee shop playlist today: lo-fi beats + rain sounds. Peak productivity mode activated ☕️🎵",
    timestamp: "6h",
    likes: 23,
    retweets: 2,
    replies: 5,
  },
  {
    id: "4",
    author: "rosh",
    content:
      "Reading about design systems and realizing we've been unconsciously building one all along. Sometimes the best architectures emerge naturally 🏗️",
    timestamp: "1d",
    likes: 34,
    retweets: 7,
    replies: 9,
  },
  {
    id: "5",
    author: "nath",
    content:
      "PSA: Remember to commit your code before trying 'one more quick fix' 😅 Future you will thank present you",
    timestamp: "2d",
    likes: 89,
    retweets: 23,
    replies: 15,
  },
];

export function TwitterFeed() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Thoughts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-80 overflow-y-auto">
        {tweets.map((tweet) => (
          <div
            key={tweet.id}
            className="border border-border rounded-lg p-3 space-y-3"
          >
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">
                  {tweet.author === "nath" ? "Y" : "F"}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{tweet.author}</span>
                <span className="text-muted-foreground text-xs">·</span>
                <span className="text-muted-foreground text-xs">
                  {tweet.timestamp}
                </span>
              </div>
            </div>
            <p className="text-sm leading-relaxed">{tweet.content}</p>
            <div className="flex items-center gap-6 text-muted-foreground">
              <div className="flex items-center gap-1 text-xs">
                <MessageCircle className="w-3 h-3" />
                {tweet.replies}
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Repeat2 className="w-3 h-3" />
                {tweet.retweets}
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Heart className="w-3 h-3" />
                {tweet.likes}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
