import ReviewPage from "./ReviewPage";

export default async function Avaliar({ params }) {
  const { slug } = await params;
  return <ReviewPage slug={slug} />;
}
