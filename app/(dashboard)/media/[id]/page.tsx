import { MediaItemPage } from "@/features/media/components/media-item-page";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MediaItemPage key={id} id={id} />;
}
