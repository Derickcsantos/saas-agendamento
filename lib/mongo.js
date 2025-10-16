require('dotenv').config();
const mongoose = require('mongoose');

// const mongoURI = process.env.MONGO_URI || 'uri do banco de dados mongodb'
// // Conexão com MongoDB
//  mongoose.connect('uri do banco de dados para a galeria, utilizar mongodb', {
//    useNewUrlParser: true,
//    useUnifiedTopology: true,
//    serverSelectionTimeoutMS: 10000,
//    socketTimeoutMS: 45000
//  })
//  .then(() => console.log('✅ MongoDB conectado com sucesso'))
//  .catch(err => {
//    console.error('❌ Falha na conexão com MongoDB:', err);
//    process.exit(1);
//  });

// module.exports = { mongoURI };