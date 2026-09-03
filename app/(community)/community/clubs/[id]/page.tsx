import { ClubDetailPage } from "@/features/community/clubs/components/club-detail-page";

export default async function CommunityClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClubDetailPage clubId={id} />;
}
