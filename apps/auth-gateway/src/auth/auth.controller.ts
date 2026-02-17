import {
  Body,
  Controller,
  HttpStatus,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(@Req() req: { user: any }) {
    return this.authService.issueTokens(req.user);
  }

  @Get('oauth/google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    return { message: 'Redirecting to Google' };
  }

  @Get('oauth/google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: { user: { email: string; displayName: string } },
    @Res() res: Response,
  ) {
    const tokens = await this.authService.oauthLogin(req.user.email, req.user.displayName);
    const webAppUrl = this.config.get<string>('WEB_APP_URL', 'http://localhost:4200');
    const redirectUrl = `${webAppUrl}/login/google-callback?accessToken=${encodeURIComponent(tokens.accessToken)}&refreshToken=${encodeURIComponent(tokens.refreshToken)}`;

    return res.redirect(HttpStatus.FOUND, redirectUrl);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  async logout(@Body() dto: RefreshDto) {
    await this.authService.logout(dto.refreshToken);
    return { success: true };
  }
}
