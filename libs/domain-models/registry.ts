export interface Team {
  id: string;
  name: string;
  memberCount: number;
  serviceCount: number;
}

export interface User {
  id: string;
  email: string;
  roles: string[];
  teamIds: string[];
}

export interface ServiceOwnership {
  serviceId: string;
  teamId: string;
  ownerUserId: string;
}
