import { Router } from 'express';
import passport from '../lib/passport.js'
import { googleCallback } from '../controllers/googleController.js';

export const googleRouter = Router();

googleRouter.get('/', (req, res, next) => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: req.query.organization_id, 
    session: false
  })(req, res, next);
});


googleRouter.get('/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login',
    session: false 
  }),
  googleCallback
);


