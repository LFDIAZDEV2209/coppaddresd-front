"use client";

import { useEffect, useState } from "react";
import { Inbox, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionHeader } from "@/components/layout/section-header";
import { useT } from "@/providers/i18n-provider";
import {
  approveMembership,
  fetchClubRequests,
  rejectMembership,
} from "../mock/clubs-api";

interface ClubRequest {
  memberId: string;
  displayName: string;
  reason: string;
}

export function ClubRequestsTab({ clubId }: { clubId: string }) {
  const t = useT();
  const [requests, setRequests] = useState<ClubRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmTarget, setConfirmTarget] = useState<ClubRequest | null>(null);
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject">(
    "approve",
  );

  const load = async () => {
    setRequests(await fetchClubRequests(clubId));
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const confirm = async () => {
    if (!confirmTarget) return;
    if (confirmAction === "approve") {
      await approveMembership(clubId, confirmTarget.memberId);
    } else {
      await rejectMembership(clubId, confirmTarget.memberId);
    }
    setConfirmTarget(null);
    await load();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <SectionHeader
          title={t("Solicitudes de ingreso")}
          description={`${requests.length} ${t("pendientes")}`}
          icon={Inbox}
          variant="primary"
        />
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            {t("Cargando solicitudes…")}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Inbox className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {t("No hay solicitudes pendientes")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {requests.map((request) => (
              <div
                key={request.memberId}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold">
                    {request.displayName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {request.reason}
                  </span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setConfirmAction("approve");
                      setConfirmTarget(request);
                    }}
                  >
                    <Check data-icon="inline-start" />
                    {t("Aprobar")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setConfirmAction("reject");
                      setConfirmTarget(request);
                    }}
                  >
                    <X data-icon="inline-start" />
                    {t("Rechazar")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={confirmTarget !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "approve"
                ? t("Aprobar solicitud")
                : t("Rechazar solicitud")}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "approve"
                ? t("El solicitante pasará a ser miembro activo del club.")
                : t("El solicitante no podrá unirse al club.")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmTarget(null)}
            >
              {t("Cancelar")}
            </Button>
            <Button
              size="sm"
              variant={confirmAction === "approve" ? "default" : "destructive"}
              onClick={confirm}
            >
              {confirmAction === "approve" ? t("Aprobar") : t("Rechazar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
