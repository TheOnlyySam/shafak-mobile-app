export type Role = 'ADMIN' | 'AGENT' | 'SUPER';
export type User = { id: string | number; username?: string; email?: string; role: Role };
export type Car = {
  id: number;
  make: string;
  model: string;
  year?: number | null;
  agent_id: number;
  agent_name?: string;
  agent_email?: string;
};
