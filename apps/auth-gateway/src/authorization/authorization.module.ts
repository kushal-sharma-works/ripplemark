import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { TeamAccessGuard } from './team-access.guard';

@Module({
  providers: [
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: TeamAccessGuard },
  ],
  exports: [RolesGuard, TeamAccessGuard],
})
export class AuthorizationModule {}
