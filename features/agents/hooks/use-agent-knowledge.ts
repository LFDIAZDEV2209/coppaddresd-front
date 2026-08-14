"use client";

import { useState, useCallback, useEffect } from "react";
import type { KnowledgeBase, AgentDocument } from "../types";
import {
  fetchKnowledgeBases,
  createKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
  fetchDocuments,
  registerDocument,
  deleteDocument,
} from "../services/agents-service";
import type { KnowledgeBaseRequest, AgentDocumentRequest } from "../types";

interface UseAgentKnowledgeReturn {
  bases: KnowledgeBase[];
  loading: boolean;
  error: string | null;
  creating: boolean;
  deletingId: string | null;
  registeringDoc: boolean;
  refetch: () => void;
  handleCreateBase: (input: KnowledgeBaseRequest) => Promise<void>;
  handleUpdateBase: (id: string, input: KnowledgeBaseRequest) => Promise<void>;
  handleDeleteBase: (id: string) => Promise<void>;
  loadDocuments: (knowledgeBaseId: string) => Promise<AgentDocument[]>;
  handleRegisterDocument: (
    knowledgeBaseId: string,
    input: AgentDocumentRequest,
  ) => Promise<void>;
  handleDeleteDocument: (id: string) => Promise<void>;
}

export function useAgentKnowledge(
  agentTypeId?: string,
  options: { includeGlobal?: boolean } = {},
): UseAgentKnowledgeReturn {
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [registeringDoc, setRegisteringDoc] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let list = await fetchKnowledgeBases(agentTypeId);
        if (options.includeGlobal) {
          const globals = await fetchKnowledgeBases();
          const globalsOnly = globals.filter((kb) => kb.scope === "Global");
          list = [...globalsOnly, ...list.filter((kb) => kb.scope !== "Global")];
        }
        if (!active) return;
        setBases(list);
        setError(null);
      } catch {
        if (!active) return;
        setError("No se pudieron cargar las knowledge bases.");
        setBases([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [agentTypeId, options.includeGlobal, refreshKey]);

  const handleCreateBase = useCallback(
    async (input: KnowledgeBaseRequest) => {
      setCreating(true);
      try {
        await createKnowledgeBase(input);
        setLoading(true);
        setRefreshKey((key) => key + 1);
      } finally {
        setCreating(false);
      }
    },
    [],
  );

  const handleUpdateBase = useCallback(async (id: string, input: KnowledgeBaseRequest) => {
    await updateKnowledgeBase(id, input);
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  const handleDeleteBase = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await deleteKnowledgeBase(id);
      setLoading(true);
      setRefreshKey((key) => key + 1);
    } finally {
      setDeletingId(null);
    }
  }, []);

  const loadDocuments = useCallback(async (knowledgeBaseId: string) => {
    return fetchDocuments(knowledgeBaseId);
  }, []);

  const handleRegisterDocument = useCallback(
    async (knowledgeBaseId: string, input: AgentDocumentRequest) => {
      setRegisteringDoc(true);
      try {
        await registerDocument(knowledgeBaseId, input);
      } finally {
        setRegisteringDoc(false);
      }
    },
    [],
  );

  const handleDeleteDocument = useCallback(async (id: string) => {
    await deleteDocument(id);
  }, []);

  const refetch = useCallback(() => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  return {
    bases,
    loading,
    error,
    creating,
    deletingId,
    registeringDoc,
    refetch,
    handleCreateBase,
    handleUpdateBase,
    handleDeleteBase,
    loadDocuments,
    handleRegisterDocument,
    handleDeleteDocument,
  };
}
