// src/app/[slug]/page.js
import CadastroPage from "./SignInPage";

export default async function Cadastro({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  return <CadastroPage slug={slug} />;
}
