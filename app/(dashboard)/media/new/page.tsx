import { MediaNewPage } from "@/features/media/components/media-new-page";
import { MediaBulkNewPage } from "@/features/media/components/media-bulk-new-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  if (mode === "bulk") return <MediaBulkNewPage />;
  return <MediaNewPage />;
}
