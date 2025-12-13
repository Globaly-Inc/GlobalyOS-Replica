/**
 * Wiki knowledge base type definitions
 */

export interface WikiFolder {
  id: string;
  organization_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WikiPage {
  id: string;
  organization_id: string;
  folder_id: string | null;
  title: string;
  content: string | null;
  sort_order: number;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WikiPageWithRelations extends WikiPage {
  created_by_employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  updated_by_employee?: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  } | null;
}

export interface WikiPageVersion {
  id: string;
  page_id: string;
  organization_id: string;
  title: string;
  content: string | null;
  edited_by: string;
  created_at: string;
}

export interface WikiFavorite {
  id: string;
  user_id: string;
  organization_id: string;
  item_type: 'page' | 'folder';
  item_id: string;
  created_at: string;
}

export interface WikiSearchResult {
  id: string;
  type: 'page' | 'folder';
  title: string;
  snippet?: string;
  folder_id?: string | null;
  parent_id?: string | null;
}
