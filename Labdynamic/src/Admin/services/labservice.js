import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/labs';

export function useLabs() {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter States
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  // Always read token fresh from localStorage to avoid stale token bugs
  const getAuthHeader = () => {
    const token = localStorage.getItem('labToken');
    return {
      headers: {
        Authorization: token ? `Bearer ${token}` : ''
      }
    };
  };

  const getErrMsg = (err) =>
    err.response?.data?.message || err.message || 'An unexpected error occurred';

  // String-safe ID equality helper
  const matchesId = (item, id) => {
    const itemId = item._id || item.id;
    return String(itemId) === String(id);
  };

  // 1. Fetch Labs with search/filter debounce
  const fetchLabs = useCallback(async () => {
    try {
      setLoading(true);
      const config = {
        ...getAuthHeader(),
        params: {
          search: search.trim() || undefined,
          category: category !== 'All' ? category : undefined,
        }
      };

      const { data } = await axios.get(API_BASE_URL, config);
      setLabs(data);
      setError(null);
    } catch (err) {
      setError(getErrMsg(err));
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  // Initial fetch and refetch on search/category change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLabs();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchLabs]);

  // 2. Create Lab
  const createLab = async (labData) => {
    try {
      const { data } = await axios.post(API_BASE_URL, labData, getAuthHeader());
      setLabs((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      throw new Error(getErrMsg(err));
    }
  };

  // 3. Update Lab
  const updateLab = async (id, labData) => {
    try {
      const { data } = await axios.put(`${API_BASE_URL}/${id}`, labData, getAuthHeader());
      setLabs((prev) =>
        prev.map((item) => (matchesId(item, id) ? data : item))
      );
      return data;
    } catch (err) {
      throw new Error(getErrMsg(err));
    }
  };

  // 4. Delete Lab
  const deleteLab = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/${id}`, getAuthHeader());
      setLabs((prev) => prev.filter((item) => !matchesId(item, id)));
    } catch (err) {
      throw new Error(getErrMsg(err));
    }
  };

  // 5. Assign Resource to Lab (from Labs page modal)
  const assignResource = async (labId, resourceData) => {
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/${labId}/resources`,
        resourceData,
        getAuthHeader()
      );
      
      const updatedLab = data.lab || data;

      // Update state immutably with updated Lab document returned by backend
      setLabs((prev) =>
        prev.map((item) => (matchesId(item, labId) ? updatedLab : item))
      );
      
      return updatedLab;
    } catch (err) {
      throw new Error(getErrMsg(err));
    }
  };

  return {
    labs,
    loading,
    error,
    category,
    setCategory,
    search,
    setSearch,
    refreshData: fetchLabs,
    createLab,
    updateLab,
    deleteLab,
    assignResource
  };
}