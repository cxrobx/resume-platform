"use client";

import type { FileNode } from "@/lib/api";

function TreeNode({
  node,
  selected,
  onSelect,
  depth = 0,
}: {
  node: FileNode;
  selected: string | null;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  if (node.type === "file") {
    const isActive = selected === node.path;
    return (
      <button
        onClick={() => onSelect(node.path)}
        className={`w-full text-left px-3 py-1 text-sm rounded transition-colors truncate ${
          isActive
            ? "bg-macos-accent text-white"
            : "text-macos-text-secondary hover:bg-macos-elevated hover:text-macos-text"
        }`}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
        title={node.path}
      >
        {node.name}
      </button>
    );
  }

  return (
    <div>
      <div
        className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-macos-text-secondary"
        style={{ paddingLeft: `${12 + depth * 12}px` }}
      >
        {node.name}
      </div>
      {node.children?.map((child) => (
        <TreeNode
          key={child.path}
          node={child}
          selected={selected}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default function FileTree({
  tree,
  selected,
  onSelect,
}: {
  tree: FileNode | null;
  selected: string | null;
  onSelect: (path: string) => void;
}) {
  if (!tree) {
    return (
      <div className="p-3 text-xs text-macos-text-secondary">Loading…</div>
    );
  }

  return (
    <div className="py-2">
      {tree.children?.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
