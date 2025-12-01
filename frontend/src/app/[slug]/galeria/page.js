import GalleryPage from './galleryPage'

export default async function Gallery({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  return <GalleryPage slug={slug} />;
}
