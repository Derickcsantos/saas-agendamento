import { Router } from 'express';
import passport from '../lib/passport.js'
import { googleCallback } from '../controllers/googleController.js';

export const googleRouter = Router();

googleRouter.get('/', (req, res, next) => {
  const state = JSON.stringify({ organization_id: req.query.organization_id });

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
    session: false,
  })(req, res, next);
});


googleRouter.get('/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login',
    session: false 
  }),
  googleCallback
);


