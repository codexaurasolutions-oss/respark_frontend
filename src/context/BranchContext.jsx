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
      const salonRole = auth?.membership?.salonRole || "";
      if (salonRole && salonRole !== "SALON_OWNER") {
        return auth?.membership?.branchId || "";
      }
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });
  const [loading, setLoading] = useState(false);

  const isOwner = (auth?.membership?.salonRole || "") === "SALON_OWNER";
  const staffBranchId = auth?.membership?.branchId || "";

  useEffect(() => {
    if (!auth?.accessToken) return;
    let active = true;
    let stopped = false;
    setLoading(true);
    api.get("/owner/branches")
      .then((res) => {
        if (active && !stopped) {
          setBranches(res.data || []);
          if (!isOwner && staffBranchId) {
            setSelectedBranchIdState(staffBranchId);
          }
        }
      })
      .catch((err) => {
        if (err?.__sessionBlocked || err?.response?.status === 401) stopped = true;
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; stopped = true; };
  }, [auth?.accessToken, isOwner, staffBranchId]);

  const setSelectedBranchId = useCallback((id) => {
    if (!isOwner && staffBranchId) return;
    const next = typeof id === "function" ? id : id;
    setSelectedBranchIdState((prev) => {
      const val = typeof id === "function" ? id(prev) : id;
      try { localStorage.setItem(STORAGE_KEY, val); } catch {}
      return val;
    });
  }, [isOwner, staffBranchId]);

  const selectedBranchName = useMemo(() => {
    if (!selectedBranchId) return isOwner ? "All Branches" : "No Branch";
    const found = branches.find((b) => b.id === selectedBranchId);
    if (found) return found.name;
    return isOwner ? "All Branches" : `Branch ${selectedBranchId.slice(0, 6)}…`;
  }, [branches, selectedBranchId, isOwner]);

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
    loading,
    isOwner
  }), [branches, selectedBranchId, selectedBranchName, setSelectedBranchId, refetch, loading, isOwner]);

  return <BranchCtx.Provider value={value}>{children}</BranchCtx.Provider>;
};

export const useBranch = () => useContext(BranchCtx);
