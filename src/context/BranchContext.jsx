/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";

const BranchCtx = createContext({
  branches: [],
  selectedBranchId: "",
  selectedBranchName: "All Branches",
  setSelectedBranchId: () => {},
  loading: false
});

const STORAGE_KEY = "respark_branch";

export const BranchProvider = ({ children }) => {
  const { auth } = useAuth();
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchIdState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });
  const [loading, setLoading] = useState(false);

  const setSelectedBranchId = useCallback((id) => {
    const next = typeof id === "function" ? id : id;
    setSelectedBranchIdState((prev) => {
      const val = typeof id === "function" ? id(prev) : id;
      try { localStorage.setItem(STORAGE_KEY, val); } catch {}
      return val;
    });
  }, []);

  useEffect(() => {
    if (!auth?.accessToken) return;
    let active = true;
    let stopped = false;
    setLoading(true);
    api.get("/owner/branches")
      .then((res) => {
        if (active && !stopped) setBranches(res.data || []);
      })
      .catch((err) => {
        if (err?.__sessionBlocked || err?.response?.status === 401) stopped = true;
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; stopped = true; };
  }, [auth?.accessToken]);

  const selectedBranchName = useMemo(() => {
    if (!selectedBranchId) return "All Branches";
    const found = branches.find((b) => b.id === selectedBranchId);
    return found?.name || "All Branches";
  }, [branches, selectedBranchId]);

  const refetch = useCallback(async () => {
    if (!auth?.accessToken) return;
    try {
      const res = await api.get("/owner/branches");
      setBranches(res.data || []);
    } catch {}
  }, [auth?.accessToken]);

  const value = useMemo(() => ({
    branches,
    selectedBranchId,
    selectedBranchName,
    setSelectedBranchId,
    refetch,
    loading
  }), [branches, selectedBranchId, selectedBranchName, setSelectedBranchId, refetch, loading]);

  return <BranchCtx.Provider value={value}>{children}</BranchCtx.Provider>;
};

export const useBranch = () => useContext(BranchCtx);
