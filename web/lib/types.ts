import type { StrapiDoc } from './strapi';

/** Editor.js OutputData —— 全链路的数据契约，前后端共用 */
export type EditorJsBlockNode = {
  id?: string;
  type: 'paragraph' | 'header' | 'list' | 'quote' | 'image' | string;
  data: Record<string, any>;
};

export type EditorJsOutput = {
  time?: number;
  version?: string;
  blocks: EditorJsBlockNode[];
};

export type UserSummary = { id: number; username: string; isAdmin?: boolean };

export type Block = StrapiDoc<{
  content: EditorJsOutput;
  blockType: 'text' | 'image' | 'link' | 'file';
  excerpt: string;
  coverImageUrl: string;
  description?: string | null;
  sourceUrl?: string | null;
  connectionCount: number;
  commentCount: number;
  creatorName: string;
  creator?: UserSummary;
}>;

export type Comment = StrapiDoc<{
  body: string;
  authorName: string;
}>;

export type Channel = StrapiDoc<{
  title: string;
  slug: string;
  description: string;
  visibility: 'public' | 'closed' | 'private';
  ownerName: string;
  collaboratorNames?: string[];
  connectionCount: number;
  followerCount?: number;
  owner?: UserSummary;
}>;

export type Connection = StrapiDoc<{
  position: number;
  connectorName: string;
  block?: Block;
  channel?: Channel;
  /** 频道套频道：这条边的内容是一个频道而非 block */
  contentChannel?: Channel;
  connector?: UserSummary;
}>;

/** Wiki item：管理员编排的有序内容单元 */
export type WikiItem =
  | { type: 'text'; content: EditorJsOutput }
  | { type: 'block'; blockId: string; note?: string }
  | { type: 'channel'; channelId: string; note?: string };

export type WikiPage = StrapiDoc<{
  title: string;
  slug: string;
  order: number;
  intro?: EditorJsOutput | null;
  items?: WikiItem[];
  published: boolean;
  curatorName?: string;
  parent?: { documentId: string; title: string; slug: string } | null;
}>;

export type WikiTreeNode = {
  documentId: string;
  title: string;
  slug: string;
  order: number;
  published: boolean;
  parentId: string | null;
};
