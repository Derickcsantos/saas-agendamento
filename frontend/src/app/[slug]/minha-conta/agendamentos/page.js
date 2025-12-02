import AppointmentsPage from "./appointmentsPage";

export default async function Appointments({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  return <AppointmentsPage slug={slug} />;
}
