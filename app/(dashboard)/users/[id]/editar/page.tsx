import { UserWizard } from "@/features/users/components/user-wizard";

/** Next 16: params es una Promise → se resuelve en el server component. */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <UserWizard mode="edit" userId={id} />;
}
