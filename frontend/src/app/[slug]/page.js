// src/app/[slug]/page.js
import ClientLanding from "./ClientLanding";

export default async function ClientePage({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  return <ClientLanding slug={slug} />;
}
