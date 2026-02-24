"use client";

import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function MonacoPane({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="w-full h-full">
      <MonacoEditor
        height="100%"
        language="plaintext"
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        options={{
          fontSize: 13,
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
          lineHeight: 20,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          renderLineHighlight: "line",
          smoothScrolling: true,
          cursorBlinking: "smooth",
          padding: { top: 12, bottom: 12 },
          tabSize: 2,
        }}
      />
    </div>
  );
}
