import { PeopleWizard } from "@/features/professionals/components/people-wizard";

export default async function Page(props: {
  searchParams?: Promise<{ mode?: string }>;
}) {
  const params = await props.searchParams;
  return <PeopleWizard initialMode={params?.mode} />;
}
