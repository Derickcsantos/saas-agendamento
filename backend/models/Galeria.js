import mongoose from 'mongoose';

// Modelo da Galeria
const ImagemSchema = new mongoose.Schema({
  dados: {
    type: Buffer,
    required: true
  },
  tipo: {
    type: String,
    required: true
  }
}, { _id: false });;

const GaleriaSchema = new mongoose.Schema({
  titulo: {
    type: String,
    default: 'Sem título'
  },
  imagem: {
    type: ImagemSchema,
    required: true
  },
  criadoEm: {
    type: Date,
    default: Date.now
  }
}, { versionKey: false });

export const Galeria = mongoose.model('Galeria', GaleriaSchema);

