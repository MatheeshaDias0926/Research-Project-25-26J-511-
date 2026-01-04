const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] && profile.emails[0].value;
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.findOne({ email });
        }
        const photo = profile.photos && profile.photos[0] && profile.photos[0].value;
        if (!user) {
          user = await User.create({
            googleId: profile.id,
            email,
            name: profile.displayName,
            avatar: photo,
          });
        } else {
          user.googleId = profile.id;
          user.name = user.name || profile.displayName;
          // update avatar if available
          if (photo) user.avatar = photo;
          await user.save();
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);
