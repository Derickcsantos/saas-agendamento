export function getUserDestination(slug, user) {
  switch (user?.tipo) {
    case "admin": return `/${slug}/admin`;
    case "funcionario": return `/${slug}/profissional`;
    case "marketing": return "/marketing";
    case "master": return "/admin-dashboard";
    default: return `/${slug}/minha-conta`;
  }
}
