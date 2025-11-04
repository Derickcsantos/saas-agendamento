import AppointmentPage from "./AppointmentPage";

export default async function ClientePage({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  return <AppointmentPage slug={slug} />;
}
