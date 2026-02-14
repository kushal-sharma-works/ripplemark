import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('OAUTH_GOOGLE_CLIENT_ID', ''),
      clientSecret: config.get<string>('OAUTH_GOOGLE_CLIENT_SECRET', ''),
      callbackURL: config.get<string>('OAUTH_GOOGLE_CALLBACK_URL', ''),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<{ email: string; displayName: string }> {
    return {
      email: profile.emails?.[0]?.value ?? '',
      displayName: profile.displayName,
    };
  }
}
