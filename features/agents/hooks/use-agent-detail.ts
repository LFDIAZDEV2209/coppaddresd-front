"use client";

import { useState, useCallback, useEffect } from "react";
import type { AgentType, AgentTypeVersion } from "../types";
import {
  fetchAgentType,
  fetchVersions,
  createVersion,
  activateVersion,
} from "../services/agents-service";

interface UseAgentDetailReturn {
  agent: AgentType | null;
  versions: AgentTypeVersion[];
  loading: boolean;
  error: string | null;
  creatingVersion: boolean;
  activatingVersionId: string | null;
  refetch: () => void;
  handleCreateVersion: (config: string, notes?: string | null) => Promise<void>;
  handleActivateVersion: (versionId: string) => Promise<void>;
}

export function useAgentDetail(agentTypeId: string): UseAgentDetailReturn {
  const [agent, setAgent] = useState<AgentType | null>(null);
  const [versions, setVersions] = useState<AgentTypeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [activatingVersionId, setActivatingVersionId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [type, versionList] = await Promise.all([
          fetchAgentType(agentTypeId),
          fetchVersions(agentTypeId),
        ]);
        if (!active) return;
        setAgent(type);
        setVersions(versionList);
        setError(null);
      } catch {
        if (!active) return;
        setError("No se pudo cargar el agente.");
        setAgent(null);
        setVersions([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [agentTypeId, refreshKey]);

  const handleCreateVersion = useCallback(
    async (config: string, notes?: string | null) => {
      setCreatingVersion(true);
      try {
        const created = await createVersion(agentTypeId, { config, notes });
        setVersions((current) =>
          [...current, created].sort((a, b) => b.versionNumber - a.versionNumber),
        );
        if (created.isActive) {
          setAgent((current) =>
            current
              ? {
                  ...current,
                  activeVersionId: created.id,
                  activeVersionNumber: created.versionNumber,
                }
              : current,
          );
        }
      } finally {
        setCreatingVersion(false);
      }
    },
    [agentTypeId],
  );

  const handleActivateVersion = useCallback(
    async (versionId: string) => {
      setActivatingVersionId(versionId);
      try {
        const activated = await activateVersion(versionId);
        setVersions((current) =>
          current.map((v) => ({
            ...v,
            isActive: v.id === activated.id,
          })),
        );
        setAgent((current) =>
          current
            ? {
                ...current,
                activeVersionId: activated.id,
                activeVersionNumber: activated.versionNumber,
              }
            : current,
        );
      } finally {
        setActivatingVersionId(null);
      }
    },
    [],
  );

  const refetch = useCallback(() => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  return {
    agent,
    versions,
    loading,
    error,
    creatingVersion,
    activatingVersionId,
    refetch,
    handleCreateVersion,
    handleActivateVersion,
  };
}
