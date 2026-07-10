declare const process: {
  env?: Record<string, string | undefined>;
};

const DEFAULT_API_URL = 'http://127.0.0.1:5001/api/v1';

export const API_URL = process.env?.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = {
  token?: string | null;
  method?: 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT';
  body?: unknown;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json'
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let body: string | undefined;
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || (body ? 'POST' : 'GET'),
    headers,
    body
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const error = data?.error;
    const message = typeof error === 'string'
      ? error
      : error?.message || 'Die Anfrage konnte nicht abgeschlossen werden.';
    throw new ApiError(message, response.status, error?.code);
  }

  return data as T;
}

export async function apiUpload<T>(path: string, formData: FormData, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const error = data?.error;
    const message = typeof error === 'string'
      ? error
      : error?.message || 'Der Upload konnte nicht abgeschlossen werden.';
    throw new ApiError(message, response.status, error?.code);
  }

  return data as T;
}
