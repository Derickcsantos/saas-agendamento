// src/app/[slug]/page.js
import EscolherPlano from "./selectPlan";

export default async function SelecionarPlano({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  return <EscolherPlano slug={slug} />;
}
