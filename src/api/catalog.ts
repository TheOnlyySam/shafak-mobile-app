import { createClient } from './client';

export type Brand = { id: string; name: string };
export type Model = { id: string; name: string; brandId?: string };

export async function fetchBrands(token?: string | null): Promise<Brand[]> {
  const c = createClient(token);
  const res = await c.get<Brand[]>('/brands.php');
  return res.data;
}

export async function fetchModels(token?: string | null, brandId?: string): Promise<Model[]> {
  const c = createClient(token);
  try {
    const res = await c.get<Model[]>('/models.php', { params: brandId ? { brandId } : {} });
    if (Array.isArray(res.data) && res.data.length > 0) return res.data;
  } catch {/* ignore and fall back */}
  const resAll = await c.get<Model[]>('/models.php');
  return resAll.data;
}
