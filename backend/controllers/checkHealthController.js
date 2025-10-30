let whatsappClient = null;

export const checkWhatsappHealth = (req, res) => {
  res.status(whatsappClient ? 200 : 503).json({
    status: whatsappClient ? 'healthy' : 'unavailable',
    timestamp: new Date()
  });
};