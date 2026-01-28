import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../api-client';

/**
 * useResource - Hook Genérico para CRUD
 *
 * ELIMINA DUPLICAÇÃO: CRUD operations estavam duplicadas em 10+ componentes.
 * APLICA DRY: Lógica reutilizável para qualquer resource.
 *
 * @example
 * ```tsx
 * const { items, loading, create, update, remove, refresh } = useResource<Task>('/tasks');
 *
 * // Criar
 * await create({ title: 'Nova tarefa' });
 *
 * // Atualizar
 * await update(taskId, { title: 'Título atualizado' });
 *
 * // Deletar
 * await remove(taskId);
 * ```
 */
export function useResource<T extends { id: string }>(
  endpoint: string,
  options: {
    autoFetch?: boolean; // Buscar automaticamente ao montar
    transformData?: (data: any) => T[]; // Transformar resposta da API
  } = {},
) {
  const { autoFetch = true, transformData } = options;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Busca todos os items
   */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.get<any>(endpoint);

      // Suporta diferentes formatos de resposta da API
      let items: T[];
      if (Array.isArray(data)) {
        items = data;
      } else if (data.data && Array.isArray(data.data)) {
        items = data.data;
      } else {
        items = [];
      }

      // Aplica transformação se fornecida
      if (transformData) {
        items = transformData(data);
      }

      setItems(items);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
      console.error(`Erro ao buscar ${endpoint}:`, err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, transformData]);

  /**
   * Cria novo item
   */
  const create = async (data: Partial<T>): Promise<T | null> => {
    try {
      const newItem = await apiClient.post<T>(endpoint, data);
      await fetchAll(); // Refresh da lista
      return newItem;
    } catch (err: any) {
      setError(err.message || 'Erro ao criar');
      console.error(`Erro ao criar em ${endpoint}:`, err);
      return null;
    }
  };

  /**
   * Atualiza item existente
   */
  const update = async (
    id: string,
    data: Partial<T>,
  ): Promise<T | null> => {
    try {
      const updated = await apiClient.put<T>(`${endpoint}/${id}`, data);
      await fetchAll(); // Refresh da lista
      return updated;
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar');
      console.error(`Erro ao atualizar ${endpoint}/${id}:`, err);
      return null;
    }
  };

  /**
   * Deleta item
   */
  const remove = async (id: string): Promise<boolean> => {
    if (!confirm('Tem certeza que deseja excluir?')) {
      return false;
    }

    try {
      await apiClient.delete(`${endpoint}/${id}`);
      await fetchAll(); // Refresh da lista
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar');
      console.error(`Erro ao deletar ${endpoint}/${id}:`, err);
      return false;
    }
  };

  /**
   * Busca item por ID
   */
  const findById = async (id: string): Promise<T | null> => {
    try {
      return await apiClient.get<T>(`${endpoint}/${id}`);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar');
      console.error(`Erro ao buscar ${endpoint}/${id}:`, err);
      return null;
    }
  };

  /**
   * Refresh manual dos dados
   */
  const refresh = useCallback(() => {
    return fetchAll();
  }, [fetchAll]);

  // Auto-fetch ao montar componente
  useEffect(() => {
    if (autoFetch) {
      fetchAll();
    }
  }, [autoFetch, fetchAll]);

  return {
    // State
    items,
    loading,
    error,

    // Methods
    create,
    update,
    remove,
    findById,
    refresh,
    fetchAll,
  };
}

/**
 * useResourceItem - Hook para item único
 *
 * @example
 * ```tsx
 * const { item, loading, update } = useResourceItem<Task>('/tasks', taskId);
 * ```
 */
export function useResourceItem<T>(endpoint: string, id: string) {
  const [item, setItem] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.get<T>(`${endpoint}/${id}`);
      setItem(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar');
      console.error(`Erro ao buscar ${endpoint}/${id}:`, err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, id]);

  const update = async (data: Partial<T>): Promise<T | null> => {
    try {
      const updated = await apiClient.put<T>(`${endpoint}/${id}`, data);
      setItem(updated);
      return updated;
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar');
      console.error(`Erro ao atualizar ${endpoint}/${id}:`, err);
      return null;
    }
  };

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    item,
    loading,
    error,
    update,
    refresh: fetch,
  };
}
