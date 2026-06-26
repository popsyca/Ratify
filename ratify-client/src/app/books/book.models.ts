export interface BookSummary {
  id: number;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  averageRating: number;
  reviewCount: number;
  topVibeColor: string;
  genre: string;
  weeklyViews: number;
}

export interface BookDetail extends BookSummary {
  vibeStats: VibeStat[];
  reviews: Review[];
}

export interface VibeStat {
  color: string;
  count: number;
}

export interface Review {
  id: number;
  userName: string;
  rating: number;
  comment: string;
  vibeColor: string;
  createdAt: string;
  bookTitle?: string;
  bookId?: number;
  canEdit?: boolean;
}

export interface Profile {
  displayName: string;
  email: string;
  reviewCount: number;
  averageRating: number;
  reviews: Review[];
}
