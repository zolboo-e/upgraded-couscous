export interface OrganizationMember {
  id: string;
  userId: string;
  role: "admin" | "member";
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  createdAt: Date;
}

export interface OrganizationDetails {
  id: string;
  name: string;
  members: OrganizationMember[];
  createdAt: Date;
  updatedAt: Date;
}
