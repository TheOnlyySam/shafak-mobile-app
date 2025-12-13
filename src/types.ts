// src/types.ts
export type Car = {
  id: string;

  // display (list) fields
  make?: string | null;
  model?: string | null;
  year?: number | null;
  vin?: string | null;
  status?: string | null;
  title?: number | 0 | 1 | boolean | null;
  eta?: string | null;                // YYYY-MM-DD
  containerNumber?: string | null;
  warehouseDate?: string | null;     // YYYY-MM-DD
  purchaseDate?: string | null;      // YYYY-MM-DD
  destination?: string | null;
  terminal?: string | null;           // terminal *name*
  agent_id?: string | null;
  agent_username?: string | null;
  agent_name?: string | null;         // <— add this (preferred for display)
  image?: string | null;

  // admin edit / DB columns
  makingYear?: number | null;
  modelid?: string | null;
  userid?: string | null;
  terminalid?: string | null;         // snake_case to match DB
  note?: string | null;

  // web-form extras
  auctionType?: 'COPART' | 'IAAI' | 'MANHEIM' | null;
  brandId?: string | null;            // brand→model helper
  color?: string | null;
  lot?: string | null;
  carKey?: 0 | 1 | null;
  issueDate?: string | null;          // YYYY-MM-DD
};

export type CarSavePayload = {
  id?: string;

  // vehicle
  makingYear?: number | null;
  vin?: string | null;
  modelid?: string | null;
  brandId?: string | null;
  color?: string | null;
  lot?: string | null;
  carKey?: 0 | 1 | null;
  title?: 0 | 1 | null;
  issueDate?: string | null;

  // assignment
  userid?: string | null;
  terminalid?: string | null;

  // logistics
  auctionType?: 'COPART' | 'IAAI' | 'MANHEIM' | null;
  destination?: string | null;
  status?: string | null;
  eta?: string | null;
  containerNumber?: string | null;

  note?: string | null;
};

// small option types for pickers
export type Brand = { id: string; name: string };
export type Model = { id: string; name: string; brandId?: string | null };

// IMPORTANT: switch to full name, keep username optional for fallback
export type Agent = { id: string; name: string; username?: string | null };

export type Terminal = { id: string; name: string };

// User used by AuthContext
export type Role = 'ADMIN' | 'AGENT' | 'USER';

export type User = {
  id: string | number;
  email?: string | null;
  name?: string | null;
  username?: string | null;

  // New API
  role?: Role | null;

  // Legacy API (some endpoints send `type`)
  type?: Role | null;
};

// =====================
// Notifications (shared: app + website)
// =====================
export type AppNotificationType = 'GENERAL' | 'CAR_STATUS';

type AppNotification = {
  id: number;
  title: string;
  body: string;
  audience: 'ALL' | 'AGENT';
  agentId?: string | null;
  createdAt: string;
};
