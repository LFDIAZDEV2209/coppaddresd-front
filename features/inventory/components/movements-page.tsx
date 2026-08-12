"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  CalendarDays,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusBadge } from "@/components/feedback/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchMovements } from "../services/inventory-service";
import type { InventoryMovement } from "../types";

export function MovementsPage() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<"all" | "Entrada" | "Salida">(
    "all",
  );
  const [from, setFrom] = useState("2024-06-01");
  const [to, setTo] = useState("2024-06-18");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  useEffect(() => {
    let cancelled = false;
    void fetchMovements({ search, direction })
      .then((data) => {
        if (!cancelled) setMovements(data);
      })
      .catch(() => {
        if (!cancelled)
          setError("No pudimos cargar el historial de movimientos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, direction]);
  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    setLoading(true);
    setError(null);
  };
  const updateDirection = (value: "all" | "Entrada" | "Salida") => {
    setDirection(value);
    setPage(1);
    setLoading(true);
    setError(null);
  };
  const visible = movements.slice((page - 1) * 5, page * 5);
  const totalPages = Math.max(1, Math.ceil(movements.length / 5));
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Movimientos"
        description="Historial auditable de cada cambio en el inventario"
        icon={ArrowLeftRight}
      />
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-info-soft text-info-foreground">
            <CalendarDays className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Filtros de auditoría</h2>
            <p className="text-xs text-muted-foreground">
              Consulta cuándo, qué y quién modificó el stock.
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px_145px_145px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Producto, lote, usuario o referencia"
              aria-label="Buscar movimientos"
            />
          </div>
          <select
            value={direction}
            onChange={(event) =>
              updateDirection(event.target.value as typeof direction)
            }
            aria-label="Filtrar tipo de movimiento"
          >
            <option value="all">Todos</option>
            <option>Entrada</option>
            <option>Salida</option>
          </select>
          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            aria-label="Fecha desde"
          />
          <Input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            aria-label="Fecha hasta"
          />
        </div>
      </section>
      {loading ? (
        <MovementSkeleton />
      ) : error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive-soft p-10 text-center text-sm text-destructive">
          {error}
        </div>
      ) : movements.length ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <SectionHeader
            title={`${movements.length} movimientos encontrados`}
            description={`Del ${from} al ${to}`}
            icon={ArrowLeftRight}
            variant="primary"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha / referencia</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Stock resultante</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Usuario / motivo
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>
                    <span className="block text-sm font-medium">
                      {movement.dateTime}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {movement.reference}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold">
                      {movement.productName}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Lote {movement.lot}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={movement.direction}
                      color={
                        movement.direction === "Entrada"
                          ? {
                              bg: "var(--success-soft)",
                              text: "var(--success-foreground)",
                              dot: "var(--success-foreground)",
                            }
                          : {
                              bg: "var(--destructive-soft)",
                              text: "var(--destructive)",
                              dot: "var(--destructive)",
                            }
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <span
                      className={`flex items-center gap-1 font-bold ${movement.direction === "Entrada" ? "text-success-foreground" : "text-destructive"}`}
                    >
                      {movement.direction === "Entrada" ? (
                        <ArrowDownToLine className="size-3.5" />
                      ) : (
                        <ArrowUpFromLine className="size-3.5" />
                      )}
                      {movement.direction === "Entrada" ? "+" : "-"}
                      {movement.quantity}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Stock anterior: {movement.stockBefore}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-semibold">
                    {movement.stockAfter}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="block text-sm">{movement.user}</span>
                    <span className="text-xs text-muted-foreground">
                      {movement.reason}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
          No hay movimientos con esos filtros.
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Página {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}

function MovementSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {[1, 2, 3, 4, 5].map((item) => (
        <div className="flex gap-4 border-b border-border py-4" key={item}>
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}
