"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardPenLine,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPatients } from "../services/patients-service";
import {
  createMedication,
  createPrescription,
  fetchPrescriptions,
} from "../services/prescriptions-service";
import type { Medication, PatientListItem, Prescription } from "../types";

export function PrescriptionsPage() {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [selected, setSelected] = useState<PatientListItem>();
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<Prescription[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [instructions, setInstructions] = useState("");
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchPatients(1, 50, { search: "", status: "all", insurerId: "all" })
      .then((result) => setPatients(result.data))
      .catch(() => setError("No pudimos cargar los pacientes."))
      .finally(() => setLoadingPatients(false));
  }, []);
  const filtered = patients.filter((patient) =>
    `${patient.firstName} ${patient.lastName} ${patient.documentNumber}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const selectPatient = async (patient: PatientListItem) => {
    setSelected(patient);
    setSuccess(false);
    setError(null);
    setLoadingHistory(true);
    try {
      setHistory(await fetchPrescriptions(patient.id));
    } catch {
      setError("No pudimos cargar el historial de recetas.");
    } finally {
      setLoadingHistory(false);
    }
  };
  const updateMedication = <K extends keyof Medication>(
    id: string,
    field: K,
    value: Medication[K],
  ) =>
    setMedications((current) =>
      current.map((medication) =>
        medication.id === id ? { ...medication, [field]: value } : medication,
      ),
    );
  const save = async () => {
    if (
      !selected ||
      medications.some(
        (medication) =>
          !medication.name.trim() ||
          !medication.dose.trim() ||
          !medication.frequency.trim(),
      )
    ) {
      setError(
        "Selecciona un paciente y completa medicamento, dosis y frecuencia.",
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const prescription = await createPrescription({
        patientId: selected.id,
        patientName: `${selected.firstName} ${selected.lastName}`,
        professional: "Dra. Laura Martínez",
        medications,
        generalInstructions: instructions,
      });
      setHistory((current) => [prescription, ...current]);
      setMedications([]);
      setInstructions("");
      setSuccess(true);
    } catch {
      setError("No pudimos guardar la receta. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Recetario"
        description="Crea y consulta recetas asociadas a tus pacientes"
        icon={ClipboardPenLine}
      />
      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
          <div>
            <h2 className="text-base font-bold">Selecciona un paciente</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Consulta su historial o crea una nueva receta.
            </p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar paciente..."
              aria-label="Buscar paciente para receta"
            />
          </div>
          {loadingPatients ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton className="h-14 rounded-xl" key={item} />
              ))}
            </div>
          ) : (
            <div className="flex max-h-[560px] flex-col gap-2 overflow-y-auto">
              {filtered.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => void selectPatient(patient)}
                  className={`flex items-center gap-2 rounded-xl border p-3 text-left ${selected?.id === patient.id ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40"}`}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {patient.firstName[0]}
                    {patient.lastName[0]}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">
                      {patient.firstName} {patient.lastName}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {patient.documentNumber}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="flex min-w-0 flex-col gap-5">
          {!selected ? (
            <EmptyPrescription />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    {selected.firstName[0]}
                    {selected.lastName[0]}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">
                      {selected.firstName} {selected.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selected.documentTypeName ?? ""} {selected.documentNumber} ·{" "}
                      {selected.insurerName ?? "Sin aseguradora"}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-info-soft px-3 py-1 text-xs font-semibold text-info-foreground">
                  {history.length} receta{history.length !== 1 ? "s" : ""}{" "}
                  registrada{history.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">
                      Nueva receta
                    </p>
                    <h2 className="mt-1 text-lg font-bold">
                      Prescripción médica
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Agrega uno o más medicamentos al tratamiento.
                    </p>
                  </div>
                  {success && (
                    <span className="flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 text-xs font-semibold text-success-foreground">
                      <CheckCircle2 className="size-3.5" />
                      Receta guardada
                    </span>
                  )}
                </div>
                <div className="mt-5 flex flex-col gap-4">
                  {medications.map((medication, index) => (
                    <MedicationRow
                      key={medication.id}
                      medication={medication}
                      index={index}
                      onChange={updateMedication}
                      onRemove={() =>
                        setMedications((current) =>
                          current.filter((item) => item.id !== medication.id),
                        )
                      }
                    />
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => {
                      setSuccess(false);
                      setMedications((current) => [
                        ...current,
                        createMedication(),
                      ]);
                    }}
                  >
                    <Plus data-icon="inline-start" />
                    Agregar medicamento
                  </Button>
                  <div className="flex flex-col gap-1.5">
                    <Label>Indicaciones generales</Label>
                    <textarea
                      value={instructions}
                      onChange={(event) => setInstructions(event.target.value)}
                      className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Recomendaciones, controles y señales de alarma"
                    />
                  </div>
                  {error && (
                    <p
                      className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive"
                      role="alert"
                    >
                      {error}
                    </p>
                  )}
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setMedications([]);
                        setInstructions("");
                        setError(null);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => void save()}
                      disabled={saving || !medications.length}
                    >
                      {saving && (
                        <LoaderCircle
                          className="animate-spin"
                          data-icon="inline-start"
                        />
                      )}
                      {saving ? "Guardando..." : "Guardar receta"}
                    </Button>
                  </div>
                </div>
              </div>
              <PrescriptionHistory history={history} loading={loadingHistory} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function MedicationRow({
  medication,
  index,
  onChange,
  onRemove,
}: {
  medication: Medication;
  index: number;
  onChange: <K extends keyof Medication>(
    id: string,
    field: K,
    value: Medication[K],
  ) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold text-foreground">
          Medicamento {index + 1}
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
          onClick={onRemove}
          aria-label={`Eliminar medicamento ${index + 1}`}
        >
          <Trash2 />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Medicamento">
          <Input
            value={medication.name}
            onChange={(event) =>
              onChange(medication.id, "name", event.target.value)
            }
            placeholder="Ej. Losartán"
          />
        </Field>
        <Field label="Principio activo">
          <Input
            value={medication.activeIngredient}
            onChange={(event) =>
              onChange(medication.id, "activeIngredient", event.target.value)
            }
            placeholder="Componente activo"
          />
        </Field>
        <Field label="Presentación">
          <Input
            value={medication.presentation}
            onChange={(event) =>
              onChange(medication.id, "presentation", event.target.value)
            }
            placeholder="Tableta 50 mg"
          />
        </Field>
        <Field label="Dosis">
          <Input
            value={medication.dose}
            onChange={(event) =>
              onChange(medication.id, "dose", event.target.value)
            }
            placeholder="1 tableta"
          />
        </Field>
        <Field label="Frecuencia">
          <select
            value={medication.frequency}
            onChange={(event) =>
              onChange(medication.id, "frequency", event.target.value)
            }
          >
            <option>Cada 8 horas</option>
            <option>Cada 12 horas</option>
            <option>Una vez al día</option>
            <option>Según necesidad</option>
          </select>
        </Field>
        <Field label="Duración">
          <Input
            value={medication.duration}
            onChange={(event) =>
              onChange(medication.id, "duration", event.target.value)
            }
            placeholder="30 días"
          />
        </Field>
        <Field label="Cantidad">
          <Input
            value={medication.quantity}
            onChange={(event) =>
              onChange(medication.id, "quantity", event.target.value)
            }
            placeholder="30 tabletas"
          />
        </Field>
        <Field label="Vía de administración">
          <select
            value={medication.route}
            onChange={(event) =>
              onChange(medication.id, "route", event.target.value)
            }
          >
            <option>Oral</option>
            <option>Tópica</option>
            <option>Intramuscular</option>
            <option>Inhalada</option>
          </select>
        </Field>
        <Field label="Indicaciones">
          <Input
            value={medication.instructions}
            onChange={(event) =>
              onChange(medication.id, "instructions", event.target.value)
            }
            placeholder="Tomar con alimentos"
          />
        </Field>
      </div>
    </div>
  );
}

function PrescriptionHistory({
  history,
  loading,
}: {
  history: Prescription[];
  loading: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4">
        <h2 className="text-base font-bold">Historial de recetas</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Recetas emitidas para el paciente seleccionado.
        </p>
      </div>
      {loading ? (
        <Skeleton className="h-20 w-full rounded-xl" />
      ) : history.length ? (
        <div className="flex flex-col gap-3">
          {history.map((prescription) => (
            <article
              className="rounded-xl border border-border p-4"
              key={prescription.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    Receta del {prescription.issuedAt}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Emitida por {prescription.professional}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                  {prescription.medications.length} medicamento
                  {prescription.medications.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {prescription.medications.map((medication) => (
                  <span
                    className="rounded-md bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary"
                    key={medication.id}
                  >
                    {medication.name || "Medicamento sin nombre"} ·{" "}
                    {medication.dose}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8 text-center">
          <ClipboardPenLine className="size-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Este paciente aún no tiene recetas registradas.
          </p>
        </div>
      )}
    </section>
  );
}
function EmptyPrescription() {
  return (
    <div className="flex min-h-[460px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <UserRound className="size-6" />
      </span>
      <h2 className="text-sm font-semibold">Selecciona un paciente</h2>
      <p className="max-w-xs text-xs text-muted-foreground">
        Elige un paciente de la lista para consultar su historial y crear una
        receta.
      </p>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
