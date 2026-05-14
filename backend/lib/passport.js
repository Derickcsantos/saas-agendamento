// backend/lib/passport.js
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
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        let state = {};
        
        // Parse state com error handling
        try {
          state = JSON.parse(req.query.state || '{}');
        } catch (parseError) {
          console.error('❌ Erro ao fazer parse do state OAuth:', parseError.message);
          return done(new Error('Estado OAuth inválido'));
        }

        const organizationId = state.organization_id;
        const email = profile.emails[0]?.value;

        if (!organizationId || !email) {
          return done(new Error('Estado OAuth incompleto: faltam organization_id ou email'));
        }

        const { data: existingUser } = await supabase
          .from("users")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("email", email)
          .single();

        if (existingUser) return done(null, existingUser);

        const { data: newUser } = await supabase
          .from("users")
          .insert([
            {
              username: profile.displayName,
              email,
              tipo: "comum",
              organization_id: organizationId,
              created_at: new Date().toISOString(),
            }
          ])
          .select()
          .single();

        return done(null, newUser);

      } catch (err) {
        console.error('❌ Erro na autenticação Google:', err.message);
        return done(err, null);
      }
    }
  )
);


export default passport;