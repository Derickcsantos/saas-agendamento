import RotaPage from "./mapboxPage";

export default async function ClientePage({ params }) {
	const { slug } = await params;
	return <RotaPage slug={slug} />;
}
