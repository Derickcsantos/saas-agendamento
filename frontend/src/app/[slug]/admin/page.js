import AdminDashboard from "./AdminDashboard";

export default async function AdminPage({ params }) {
  const { slug } = await params; 
  return <AdminDashboard slug={slug} />;
}
