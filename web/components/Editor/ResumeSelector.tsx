"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { createResume, deleteResume, renameResume } from "@/lib/api";

interface ResumeSelectorProps {
  resumes: string[];
  current: string;
  onSwitch: (name: string) => void;
  onRefresh: () => void;
}

export default function ResumeSelector({ resumes, current, onSwitch, onRefresh }: ResumeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [copyFrom, setCopyFrom] = useState("");
  const [renamingItem, setRenamingItem] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setRenamingItem(null);
        setError("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleCreate = useCallback(async () => {
    const name = newName.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name) return;
    setError("");
    try {
      await createResume(name, copyFrom || undefined);
      setNewName("");
      setCopyFrom("");
      setCreating(false);
      setOpen(false);
      onRefresh();
      onSwitch(name);
    } catch (e: any) {
      setError(e.message || "Failed to create");
    }
  }, [newName, copyFrom, onRefresh, onSwitch]);

  const handleRename = useCallback(async (oldName: string) => {
    const name = renameValue.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name || name === oldName) {
      setRenamingItem(null);
      return;
    }
    setError("");
    try {
      await renameResume(oldName, name);
      setRenamingItem(null);
      setRenameValue("");
      onRefresh();
      if (oldName === current) {
        onSwitch(name);
      }
    } catch (e: any) {
      setError(e.message || "Failed to rename");
    }
  }, [renameValue, current, onRefresh, onSwitch]);

  const handleDelete = useCallback(async (name: string) => {
    if (name === "default") return;
    try {
      await deleteResume(name);
      onRefresh();
      if (name === current) {
        onSwitch("default");
      }
    } catch (e: any) {
      setError(e.message || "Failed to delete");
    }
  }, [current, onRefresh, onSwitch]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(!open); setCreating(false); setRenamingItem(null); setError(""); }}
        className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-macos-elevated hover:bg-macos-border text-macos-text transition-colors"
      >
        <span className="opacity-60">Resume:</span>
        <span>{current}</span>
        <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-macos-surface border border-macos-border rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Resume list */}
          <div className="max-h-48 overflow-y-auto">
            {resumes.map((name) => (
              <div
                key={name}
                className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${
                  name === current
                    ? "bg-macos-accent/20 text-macos-accent"
                    : "text-macos-text hover:bg-macos-elevated"
                }`}
              >
                {renamingItem === name ? (
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(name);
                      if (e.key === "Escape") setRenamingItem(null);
                    }}
                    onBlur={() => handleRename(name)}
                    className="flex-1 px-1 py-0.5 rounded text-xs bg-macos-bg border border-macos-accent text-macos-text focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <>
                    <span
                      className="flex-1 truncate"
                      onClick={() => { onSwitch(name); setOpen(false); }}
                    >
                      {name}
                    </span>
                    {name !== "default" && (
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingItem(name);
                            setRenameValue(name);
                            setError("");
                          }}
                          className="p-0.5 rounded text-macos-text-secondary hover:text-macos-accent hover:bg-macos-accent/10 transition-colors"
                          title="Rename resume"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(name); }}
                          className="p-0.5 rounded text-macos-text-secondary hover:text-macos-error hover:bg-macos-error/10 transition-colors"
                          title="Delete resume"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-macos-border" />

          {/* Create new */}
          {!creating ? (
            <button
              onClick={() => setCreating(true)}
              className="w-full px-3 py-2 text-xs text-macos-accent hover:bg-macos-elevated transition-colors text-left"
            >
              + New Resume
            </button>
          ) : (
            <div className="p-3 space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Resume name"
                className="w-full px-2 py-1 rounded text-xs bg-macos-bg border border-macos-border text-macos-text placeholder:text-macos-text-secondary focus:outline-none focus:border-macos-accent"
                autoFocus
              />
              <select
                value={copyFrom}
                onChange={(e) => setCopyFrom(e.target.value)}
                className="w-full px-2 py-1 rounded text-xs bg-macos-bg border border-macos-border text-macos-text focus:outline-none focus:border-macos-accent"
              >
                <option value="">Start from template</option>
                {resumes.map((r) => (
                  <option key={r} value={r}>Copy from: {r}</option>
                ))}
              </select>
              {error && <p className="text-xs text-macos-error">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  className="flex-1 px-2 py-1 rounded text-xs font-medium bg-macos-accent hover:bg-macos-accent-hover text-white transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => { setCreating(false); setError(""); }}
                  className="px-2 py-1 rounded text-xs text-macos-text-secondary hover:bg-macos-elevated transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && !creating && (
            <div className="px-3 py-2 text-xs text-macos-error border-t border-macos-border">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
