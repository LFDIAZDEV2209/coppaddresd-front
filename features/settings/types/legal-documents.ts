export interface LegalDocumentSummary {
  id: string;
  code: string;
  title: string;
  currentVersion: string | null;
  latestDraft: string | null;
  isPublished: boolean;
  versionCount: number;
  updatedAt: string;
}

export interface LegalDocumentVersion {
  id: string;
  major: number;
  minor: number;
  versionLabel: string;
  isPublished: boolean;
  content: string;
  createdBy: string | null;
  createdAt: string;
  isCurrent: boolean;
}

export interface LegalDocumentDetail extends LegalDocumentSummary {
  versions: LegalDocumentVersion[];
}

export interface DocumentVersionListItem {
  documentId: string;
  documentCode: string;
  documentTitle: string;
  versionId: string;
  major: number;
  minor: number;
  versionLabel: string;
  isPublished: boolean;
  content: string;
  createdBy: string | null;
  createdAt: string;
  isCurrent: boolean;
}

export interface SaveDraftInput {
  title: string;
  content: string;
  createdBy: string | null;
}

export interface PublishInput {
  sourceVersionId?: string;
}
