export default function RecentClients({ clients }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6">
      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
        Clientes Recentes
      </h4>
      
      <div className="space-y-4">
        {clients.map((client) => (
          <div key={client.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                {client.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{client.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{client.email}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">{client.signupDate}</p>
              <span className={`text-xs px-2 py-1 rounded-full ${
                client.status === 'active' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {client.status === 'active' ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}