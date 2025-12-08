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
      passReqToCallback: true,
      session: false
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const organizationId = req.query.state; 
        const email = profile.emails[0].value;
        const username = profile.displayName;

        const { data: existingUser, error: findError } = await supabase
          .from("users")
          .select("id, username, email, aniversario, phone, tipo, organization_id")
          .eq("organization_id", organizationId)
          .eq("email", email)
          .single();

        if (existingUser) {
          return done(null, existingUser);
        }

        const { data: newUser, error: insertError } = await supabase
          .from("users")
          .insert([
            {
              username: username,
              email: email,
              password: null, 
              tipo: "comum",
              organization_id: organizationId,
              created_at: new Date().toISOString(),
            },
          ])
          .select("id, username, email, aniversario, phone, tipo, organization_id")
          .single();

        if (insertError) {
          console.error("Erro ao criar usuário Google:", insertError);
          return done(insertError, null);
        }

        return done(null, newUser);

      } catch (err) {
        console.error("Erro na estratégia Google:", err);
        return done(err, null);
      }
    }
  )
);

// passport.serializeUser((user, done) => {
//   done(null, user);
// });

// passport.deserializeUser((obj, done) => {
//   done(null, obj);
// });

export default passport;
