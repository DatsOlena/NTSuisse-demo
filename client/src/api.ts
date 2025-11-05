const API_BASE = '/api/data';

export interface DataItem {
  id: number;
  name: string;
  description: string;
  createdAt: string;
}

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchAllItems(): Promise<DataItem[]> {
  return apiRequest<DataItem[]>('');
}

export async function fetchItem(id: number): Promise<DataItem> {
  return apiRequest<DataItem>(`/${id}`);
}

export async function createItem(name: string, description: string): Promise<DataItem> {
  return apiRequest<DataItem>('', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
}

export async function updateItem(id: number, name: string, description: string): Promise<DataItem> {
  return apiRequest<DataItem>(`/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, description }),
  });
}

export async function deleteItem(id: number): Promise<void> {
  return apiRequest<void>(`/${id}`, {
    method: 'DELETE',
  });
}

