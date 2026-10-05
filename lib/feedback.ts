export type Vote = -1 | 0 | 1;

export interface EntryFeedback {
  likes: number;
  dislikes: number;
  comments: number;
  vote: Vote;
}

export interface Comment {
  id: number;
  body: string;
  createdAt: string;
}

export interface CommentPage {
  comments: Comment[];
  nextCursor: number | null;
}

export const emptyFeedback: EntryFeedback = { likes: 0, dislikes: 0, comments: 0, vote: 0 };
