export type ContentType = "blog" | "repo" | "video" | "paper" | "social";
export type TagColor = "purple" | "cyan" | "green" | "amber";

export interface Tag {
  name: string;
  color: TagColor;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  domain: string;
  summary: string;
  contentType: ContentType;
  tags: Tag[];
  timestamp: string;
  isFavorite: boolean;
  isProcessing: boolean;
}

export interface Collection {
  id: string;
  name: string;
  count: number;
  color: string;
  favicons: string[];
}
