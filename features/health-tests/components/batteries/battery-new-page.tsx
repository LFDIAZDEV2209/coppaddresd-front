"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Layers } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useT } from "@/providers/i18n-provider";
import { healthTestsApi } from "../../services/health-tests-service";
import { CreateBatteryFields } from "./create-battery-dialog";
import { useCatalog } from "../../hooks/use-health-tests";
import type { CreateBatteryInput } from "../../services/health-tests-service";

/**
 * Página dedicada de creación de baterías (/health-tests/baterias/new):
 * reemplaza al antiguo modal "Nueva batería". Tras crear redirige al detalle
 * de la batería (flujo existente del módulo).
 */
export function BatteryNewPage() {
  const t = useT();
  const router = useRouter();
  const { data, loading } = useCatalog();
  const [creating, setCreating] = useState(false);

  const handleCreate = async (input: CreateBatteryInput) => {
    setCreating(true);
    try {
      const created = await healthTestsApi.createBattery(input);
      router.push(`/health-tests/baterias/${created.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit text-muted-foreground"
        onClick={() => router.push("/health-tests/baterias")}
      >
        <ArrowLeft data-icon="inline-start" />
        {t("Volver a Baterías")}
      </Button>

      <PageHeader
        title={t("Nueva batería")}
        description={t(
          "Define el código, el nombre y los tests que componen la batería.",
        )}
        icon={Layers}
      />

      <div className="w-full overflow-hidden rounded-2xl border border-border bg-card">
        {loading || !data ? (
          <p className="p-6 text-[12.5px] text-muted-foreground">
            {t("Cargando catálogo de tests...")}
          </p>
        ) : (
          <CreateBatteryFields
            key="new"
            tests={data.tests}
            saving={creating}
            onCancel={() => router.push("/health-tests/baterias")}
            onCreate={handleCreate}
          />
        )}
      </div>
    </div>
  );
}
