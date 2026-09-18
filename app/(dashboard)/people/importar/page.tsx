import { PeopleBulkImport } from "@/features/professionals/components/people-bulk-import";

/** Orígenes válidos del botón Volver (evita open redirect vía ?from=). */
const VALID_FROM = new Set(["/users", "/patients", "/employees"]);

export default async function Page(props: {
  searchParams?: Promise<{ from?: string }>;
}) {
  const params = await props.searchParams;
  const from = params?.from ?? "";
  return (
    <PeopleBulkImport backHref={VALID_FROM.has(from) ? from : "/patients"} />
  );
}
