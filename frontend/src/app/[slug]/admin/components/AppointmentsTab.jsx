"use client";
import { useEffect, useState } from "react";

export default function AppointmentsTab({ org }) {
  const [appointments, setAppointments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAppointments() {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/appointments/${org.slug_organization}`
      );
      const data = await res.json();
      setAppointments(data);
    } catch (err) {
      console.error("Erro ao buscar agendamentos:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
    // Carregar listas auxiliares
    Promise.all([
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/employees`
      ).then((r) => r.json()),
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/services`
      ).then((r) => r.json()),
    ]).then(([emps, servs]) => {
      setEmployees(emps);
      setServices(servs);
    });
  }, []);

  const handleStatusChange = async (id, status) => {
    if (!confirm("Deseja realmente atualizar o status?")) return;
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/${org.slug_organization}/appointments/${id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );
    loadAppointments();
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h4 className="font-semibold text-gray-700 mb-4">Agendamentos</h4>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">Serviço</th>
                <th className="px-3 py-2 text-left">Profissional</th>
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-left">Hora</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length ? (
                appointments.map((a) => (
                  <tr key={a.id} className="border-b">
                    <td className="px-3 py-2">{a.client_name}</td>
                    <td className="px-3 py-2">{a.service_name}</td>
                    <td className="px-3 py-2">{a.employee_name}</td>
                    <td className="px-3 py-2">
                      {new Date(a.date).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-2">{a.time}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          a.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : a.status === "canceled"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="border rounded-md p-1 text-sm"
                        value={a.status}
                        onChange={(e) =>
                          handleStatusChange(a.id, e.target.value)
                        }
                      >
                        <option value="pending">Pendente</option>
                        <option value="completed">Concluído</option>
                        <option value="canceled">Cancelado</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center text-gray-400 py-4"
                  >
                    Nenhum agendamento encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
