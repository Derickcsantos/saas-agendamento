// src/app/[slug]/page.js
import LoginPage from "./LoginPage";

export default async function Login({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  return <LoginPage slug={slug} />;
}
