export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
}

export const mockCurrentUser: CurrentUser = {
  id: "usr-001",
  name: "María López",
  email: "maria.lopez@coppaddresd.com",
  role: "Superadministradora",
  initials: "ML",
};
