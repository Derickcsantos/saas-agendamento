import AppointmentPage from "./AppointmentPage";

export default async function Agendamento({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  return <AppointmentPage slug={slug} />;
}
