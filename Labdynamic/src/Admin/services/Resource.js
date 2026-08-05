import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('labToken');
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : ''
    }
  };
};

export function useResources() {
  const [resources, setResources] = useState([]);
  const [labsList, setLabsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  const getErrMsg = (err) =>
    err.response?.data?.message || err.message || 'An unexpected error occurred.';


  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resourceConfig = {
        ...getAuthHeader(),
        params: {
          search: search.trim() || undefined,
          category: category !== 'All' ? category : undefined
        }
      };

      const [resResponse, labsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/resources`, resourceConfig),
        axios.get(`${API_BASE_URL}/labs`, getAuthHeader())
      ]);

      setResources(resResponse.data);
      setLabsList(labsResponse.data);
    } catch (err) {
      setError(getErrMsg(err));
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  // Debounced refetch whenever search or category changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchData]);

  // API Action Handlers
  const addResource = async (formData) => {
    try {
      const { data: createdResource } = await axios.post(
        `${API_BASE_URL}/resources`,
        formData,
        getAuthHeader()
      );
      setResources((prev) => [...prev, createdResource]);
      return createdResource;
    } catch (err) {
      const msg = getErrMsg(err);
      alert(msg);
      throw new Error(msg);
    }
  };

  const updateResource = async (id, formData) => {
    try {
      const { data: updated } = await axios.put(
        `${API_BASE_URL}/resources/${id}`,
        formData,
        getAuthHeader()
      );
      setResources((prev) =>
        prev.map((r) => (String(r.id || r._id) === String(id) ? updated : r))
      );
      return updated;
    } catch (err) {
      const msg = getErrMsg(err);
      alert(msg);
      throw new Error(msg);
    }
  };

  // Quick Quantity Change (+ / -) Handler
  const quickQuantityChange = async (target, delta) => {
    const resourceObj =
      typeof target === 'object'
        ? target
        : resources.find((r) => String(r._id || r.id) === String(target));
    if (!resourceObj) return;

    const resId = resourceObj._id || resourceObj.id;
    const currentTotal = Number(resourceObj.totalQuantity) || 0;
    const newTotal = currentTotal + delta;

    if (newTotal < 0) return; // Prevent negative stock

    // Optimistic UI update
    setResources((prev) =>
      prev.map((r) =>
        String(r.id || r._id) === String(resId)
          ? { ...r, totalQuantity: newTotal }
          : r
      )
    );

    try {
      const { data: updated } = await axios.put(
        `${API_BASE_URL}/resources/${resId}`,
        { totalQuantity: newTotal },
        getAuthHeader()
      );
      setResources((prev) =>
        prev.map((r) => (String(r.id || r._id) === String(resId) ? updated : r))
      );
    } catch (err) {
      // Rollback on failure
      setResources((prev) =>
        prev.map((r) =>
          String(r.id || r._id) === String(resId)
            ? { ...r, totalQuantity: currentTotal }
            : r
        )
      );
      const msg = getErrMsg(err);
      alert(msg);
    }
  };

  const deleteResource = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/resources/${id}`, getAuthHeader());
      setResources((prev) =>
        prev.filter((r) => String(r.id || r._id) !== String(id))
      );
    } catch (err) {
      const msg = getErrMsg(err);
      alert(msg);
      throw new Error(msg);
    }
  };

  // Fixed Assign Handler
  // Inside useResources hook
const assignToLab = async (resourceId, labId, quantity) => {
  try {
    const { data: updatedResource } = await axios.post(
      `${API_BASE_URL}/resources/${resourceId}/assign`,
      {
        labId,                               // Matches schema key 'labId'
        assignedQuantity: Number(quantity)   // Renamed from 'quantity' -> 'assignedQuantity'
      },
      getAuthHeader()
    );

    // Update local state with returned populated object
    setResources((prev) =>
      prev.map((r) =>
        String(r.id || r._id) === String(resourceId) ? updatedResource : r
      )
    );

    return updatedResource;
  } catch (err) {
    const msg = getErrMsg(err);
    alert(msg);
    throw new Error(msg);
  }
};

  // Flexible Unassign Handler
  const unassignLab = async (arg1, arg2) => {
    let targetResourceId;
    let targetLabId;

    if (typeof arg1 === 'object' && arg1 !== null) {
      targetResourceId = arg1.resourceId;
      targetLabId = arg1.labId;
    } else {
      targetResourceId = arg1;
      targetLabId = arg2;
    }

    if (!targetResourceId || !targetLabId) {
      console.error('Unassign failed: Missing resourceId or labId', {
        targetResourceId,
        targetLabId
      });
      return;
    }

    try {
      const { data: updatedResource } = await axios.delete(
        `${API_BASE_URL}/resources/${targetResourceId}/unassign/${targetLabId}`,
        getAuthHeader()
      );
      setResources((prev) =>
        prev.map((r) =>
          String(r.id || r._id) === String(targetResourceId)
            ? updatedResource
            : r
        )
      );
      return updatedResource;
    } catch (err) {
      const msg = getErrMsg(err);
      alert(msg);
      throw new Error(msg);
    }
  };

  return {
    resources,
    labsList,
    loading,
    error,
    category,
    setCategory,
    search,
    setSearch,
    refreshData: fetchData,
    addResource,
    updateResource,
    quickQuantityChange,
    deleteResource,
    assignToLab,
    unassignLab
  };
}