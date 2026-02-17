import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { TeamAccessGuard } from './team-access.guard';

@Module({
  providers: [
    RolesGuard,
    TeamAccessGuard,
    { provide: APP_GUARD, useExisting: RolesGuard },
    { provide: APP_GUARD, useExisting: TeamAccessGuard },
  ],
  exports: [RolesGuard, TeamAccessGuard],
})
export class AuthorizationModule {}
