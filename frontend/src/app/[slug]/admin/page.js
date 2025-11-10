import AdminDashboard from "./AdminDashboard";

export default function AdminPage({ params }) {
  const { slug } = params; 
  return <AdminDashboard slug={slug} />;
}
