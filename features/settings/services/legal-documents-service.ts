import { apiFetch } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import type {
  DocumentVersionListItem,
  LegalDocumentDetail,
  LegalDocumentSummary,
  LegalDocumentVersion,
  PublishInput,
  SaveDraftInput,
} from "../types/legal-documents";

const PATH = `${env.apiUrl}/api/v1/legal-documents`;

export function listLegalDocuments() {
  return apiFetch<LegalDocumentSummary[]>(PATH);
}

export function listAllLegalDocumentVersions() {
  return apiFetch<DocumentVersionListItem[]>(`${PATH}/all-versions`);
}

export function getLegalDocument(code: string) {
  return apiFetch<LegalDocumentDetail>(`${PATH}/${encodeURIComponent(code)}`);
}

export function listLegalDocumentVersions(code: string) {
  return apiFetch<LegalDocumentVersion[]>(
    `${PATH}/${encodeURIComponent(code)}/versions`,
  );
}

export function saveLegalDocumentDraft(code: string, input: SaveDraftInput) {
  return apiFetch<LegalDocumentDetail>(`${PATH}/${encodeURIComponent(code)}/drafts`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function publishLegalDocument(code: string, input: PublishInput) {
  return apiFetch<LegalDocumentDetail>(`${PATH}/${encodeURIComponent(code)}/publish`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
