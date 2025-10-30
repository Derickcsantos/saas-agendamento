import { Router } from 'express';
import passport from '../lib/passport.js'
import { handleGoogleAuth, googleCallback } from '../controllers/googleController.js';

export const googleRouter = Router();

googleRouter.get('/', handleGoogleAuth, (req, res, next) => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: req.query.organization_id,
  })(req, res, next);
});

googleRouter.get(
  '/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  googleCallback
);


