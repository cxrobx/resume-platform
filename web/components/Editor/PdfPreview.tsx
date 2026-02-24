"use client";

export default function PdfPreview({ src }: { src: string }) {
  if (!src) {
    return (
      <div className="flex items-center justify-center h-full text-macos-text-secondary text-sm">
        <div className="text-center space-y-2">
          <div className="text-4xl opacity-30">📄</div>
          <p>No preview yet — edit a file to compile</p>
        </div>
      </div>
    );
  }

  return (
    // key forces full iframe reload when src changes (cache-bust)
    <iframe
      key={src}
      src={src}
      className="w-full h-full border-0 bg-white"
      title="Resume PDF Preview"
    />
  );
}
