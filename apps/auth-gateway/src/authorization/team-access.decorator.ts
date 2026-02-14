import { SetMetadata } from '@nestjs/common';

export const TEAM_ACCESS_KEY = 'team-access';
export const TeamAccess = () => SetMetadata(TEAM_ACCESS_KEY, true);
