export type Role = "ADMIN" | "AGENT";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AssignableUser {
  id: string;
  name: string;
  role: Role;
}
