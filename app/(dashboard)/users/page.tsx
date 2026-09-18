import { redirect } from "next/navigation";
import { UsersPageContent } from "@/features/users/components/users-page-content";

export default async function Page(props: {
  searchParams?: Promise<{ action?: string }>;
}) {
  const params = await props.searchParams;
  if (params?.action === "create") {
    redirect("/people/new?mode=user");
  }
  return <UsersPageContent />;
}
