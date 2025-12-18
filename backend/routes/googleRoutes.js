import { Router } from 'express';
import passport from '../lib/passport.js'
import { googleCallback } from '../controllers/googleController.js';

export const googleRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Autenticação Google
 *     description: Endpoints para login e callback via Google OAuth2
 */

/**
 * @swagger
 * /api/google:
 *   get:
 *     summary: Redireciona o usuário para autenticação do Google
 *     description: |
 *       Inicia o fluxo de autenticação via Google OAuth2.  
 *       Opcionalmente recebe **organization_id** via query para vincular o login à organização.
 *     tags: [Autenticação Google]
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID da organização, enviado no state do OAuth
 *     responses:
 *       302:
 *         description: Redirecionamento para a página de login do Google
 *       500:
 *         description: Erro ao iniciar autenticação
 */
googleRouter.get('/', (req, res, next) => {
  const state = JSON.stringify({ organization_id: req.query.organization_id });

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
    session: false,
  })(req, res, next);
});

/**
 * @swagger
 * /api/google/callback:
 *   get:
 *     summary: Callback da autenticação Google
 *     description: |
 *       Endpoint chamado pelo Google após a autenticação.  
 *       Valida o login e retorna os dados do usuário autenticado.
 *     tags: [Autenticação Google]
 *     responses:
 *       200:
 *         description: Autenticação realizada com sucesso
 *       302:
 *         description: Redirecionamento em caso de sucesso
 *       401:
 *         description: Falha na autenticação
 *       500:
 *         description: Erro ao processar callback
 */
googleRouter.get('/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login',
    session: false 
  }),
  googleCallback
);


