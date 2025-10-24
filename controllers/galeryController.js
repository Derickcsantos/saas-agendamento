import express from 'express';
import { supabase } from '../lib/supabase.js';
import sharp from 'sharp';
import { Galeria } from '../models/Galeria.js';
import mongoose from 'mongoose';

export const getImages = async (req, res) => {
  try {
    const imagens = await Galeria.find({}, { 'imagem.dados': 0 }) // Exclui os dados binários da lista
      .sort({ criadoEm: -1 });
    res.json(imagens);
  } catch (error) {
    console.error('Erro ao listar imagens:', error);
    res.status(500).json({ error: 'Erro ao carregar galeria' });
  }
};

export const getImageById = async (req, res) => {
  try {
    const imagem = await Galeria.findById(req.params.id).select('imagem');
    
    if (!imagem) {
      return res.status(404).send('Imagem não encontrada');
    }

    res.set('Content-Type', imagem.imagem.tipo);
    res.send(imagem.imagem.dados);

  } catch (error) {
    console.error('Erro ao recuperar imagem:', error);
    res.status(500).send('Erro no servidor');
  }
};

export const getImageBySearch = async (req, res) => {
  try {
    const { termo } = req.query;
    
    if (!termo || termo.trim() === '') {
      return res.status(400).json({ error: 'Termo de busca é obrigatório' });
    }

    const imagens = await Galeria.find(
      { titulo: { $regex: termo, $options: 'i' } },
      { 'imagem.dados': 0 } // Exclui os dados binários
    ).sort({ criadoEm: -1 });

    res.json(imagens);
  } catch (error) {
    console.error('Erro na busca:', error);
    res.status(500).json({ error: 'Erro ao buscar imagens' });
  }
};

export const addImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    const novaImagem = new Galeria({
      titulo: req.body.titulo || 'Sem título',
      imagem: {
        dados: req.file.buffer,
        tipo: req.file.mimetype
      }
    });

    await novaImagem.save();

    res.json({ 
      success: true,
      id: novaImagem._id,
      titulo: novaImagem.titulo,
      criadoEm: novaImagem.criadoEm
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Falha ao salvar imagem' });
  }
};

export const deleteImage = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const resultado = await Galeria.findByIdAndDelete(req.params.id);
    
    if (!resultado) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    res.json({ success: true, message: 'Imagem excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir imagem:', error);
    res.status(500).json({ error: 'Erro ao excluir imagem' });
  }
};