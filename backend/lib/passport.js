import passport from 'passport';
import passportGoogleOauth20 from 'passport-google-oauth20';
import { supabase } from '../lib/supabase.js';

const GoogleStrategy = passportGoogleOauth20.Strategy;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_SECRET_KEY,
      callbackURL: process.env.CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const organizationId = req.query.state;
        const email = profile.emails[0].value;
        const username = profile.displayName;

        const { data: existingUser } = await supabase
          .from('users')
          .select('id, username, email, aniversario, phone, tipo, organization_id')
          .eq('organization_id', organizationId)
          .eq('email', email)
          .single();

        if (!existingUser) {
          return done(null, false, { message: "Usuário não pertence à organização" });
        }

        if (existingUser) return done(null, existingUser);

        const { data: newUser, error } = await supabase
          .from('users')
          .insert([
            {
              username,
              email,
              password_plaintext: null,
              tipo: 'comum',
              organization_id: organizationId,
              created_at: new Date().toISOString(),
            },
          ])
          .select('id, username, email, aniversario, phone, tipo, organization_id')
          .single();

        if (error) throw error;
        return done(null, newUser);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

export default passport;
