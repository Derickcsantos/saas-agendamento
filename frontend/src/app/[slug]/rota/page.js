// src/app/[slug]/page.js
import RotaPage from "./mapboxPage";

export default async function ClientePage({ params }) {
	const resolvedParams = await params;
	const { slug } = resolvedParams;

	return <RotaPage slug={slug} />;
}
