import React from "react";

interface Props {
  content?: string | null;
  className?: string;
}

/**
 * Safely parses and renders Markdown formatted text without external heavyweight dependencies.
 * Supports headings, bold, italic, bullet lists, numbered lists, blockquotes, links, and code spans.
 */
export default function RichTextView({ content, className = "" }: Props) {
  if (!content || !content.trim()) {
    return null;
  }

  const parseInline = (text: string): React.ReactNode[] => {
    // Regex matches inline elements: bold, italic, inline code, links
    const tokens: React.ReactNode[] = [];
    // Match: `code`, **bold**, *italic*, [link](url)
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      // Plain text before match
      if (match.index > lastIndex) {
        tokens.push(text.slice(lastIndex, match.index));
      }

      const raw = match[0];
      if (raw.startsWith("`") && raw.endsWith("`")) {
        tokens.push(
          <code
            key={match.index}
            className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 text-xs font-mono"
          >
            {raw.slice(1, -1)}
          </code>,
        );
      } else if (raw.startsWith("**") && raw.endsWith("**")) {
        tokens.push(
          <strong key={match.index} className="font-bold text-gray-900">
            {raw.slice(2, -2)}
          </strong>,
        );
      } else if (raw.startsWith("*") && raw.endsWith("*")) {
        tokens.push(
          <em key={match.index} className="italic text-gray-800">
            {raw.slice(1, -1)}
          </em>,
        );
      } else if (raw.startsWith("[") && raw.includes("](") && raw.endsWith(")")) {
        const linkText = raw.slice(1, raw.indexOf("]("));
        const linkUrl = raw.slice(raw.indexOf("](") + 2, -1);
        const isSafe = /^https?:\/\//i.test(linkUrl) || /^mailto:/i.test(linkUrl);

        tokens.push(
          <a
            key={match.index}
            href={isSafe ? linkUrl : "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-700 underline font-medium"
          >
            {linkText}
          </a>,
        );
      }

      lastIndex = match.index + raw.length;
    }

    if (lastIndex < text.length) {
      tokens.push(text.slice(lastIndex));
    }

    return tokens;
  };

  // Block level parser
  const lines = content.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushList = (key: number) => {
    if (!currentList) return;
    if (currentList.type === "ul") {
      blocks.push(
        <ul key={`list-${key}`} className="list-disc pl-5 space-y-1 my-2 text-gray-700 text-sm">
          {currentList.items.map((item, idx) => (
            <li key={idx}>{parseInline(item)}</li>
          ))}
        </ul>,
      );
    } else {
      blocks.push(
        <ol key={`list-${key}`} className="list-decimal pl-5 space-y-1 my-2 text-gray-700 text-sm">
          {currentList.items.map((item, idx) => (
            <li key={idx}>{parseInline(item)}</li>
          ))}
        </ol>,
      );
    }
    currentList = null;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check for bullet list item (- or *)
    if (/^[-*]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*]\s+/, "");
      if (currentList && currentList.type === "ul") {
        currentList.items.push(itemText);
      } else {
        flushList(index);
        currentList = { type: "ul", items: [itemText] };
      }
      return;
    }

    // Check for numbered list item (1. 2.)
    if (/^\d+\.\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^\d+\.\s+/, "");
      if (currentList && currentList.type === "ol") {
        currentList.items.push(itemText);
      } else {
        flushList(index);
        currentList = { type: "ol", items: [itemText] };
      }
      return;
    }

    // Non-list line, flush any active list
    flushList(index);

    if (!trimmed) {
      // Empty line / paragraph break
      return;
    }

    // Heading 1 (# )
    if (trimmed.startsWith("# ")) {
      blocks.push(
        <h2 key={index} className="text-lg font-bold text-gray-900 mt-4 mb-1.5 first:mt-0">
          {parseInline(trimmed.slice(2))}
        </h2>,
      );
      return;
    }

    // Heading 2 (## )
    if (trimmed.startsWith("## ")) {
      blocks.push(
        <h3 key={index} className="text-base font-bold text-gray-900 mt-3.5 mb-1.5 first:mt-0">
          {parseInline(trimmed.slice(3))}
        </h3>,
      );
      return;
    }

    // Heading 3 (### )
    if (trimmed.startsWith("### ")) {
      blocks.push(
        <h4 key={index} className="text-sm font-bold text-gray-900 mt-3 mb-1 first:mt-0">
          {parseInline(trimmed.slice(4))}
        </h4>,
      );
      return;
    }

    // Blockquote (> )
    if (trimmed.startsWith("> ")) {
      blocks.push(
        <blockquote
          key={index}
          className="border-l-2 border-indigo-400 pl-3.5 py-0.5 my-2 text-sm text-gray-600 italic bg-gray-50/50 rounded-r-lg"
        >
          {parseInline(trimmed.slice(2))}
        </blockquote>,
      );
      return;
    }

    // Standard Paragraph
    blocks.push(
      <p key={index} className="text-sm text-gray-700 leading-relaxed my-1.5">
        {parseInline(trimmed)}
      </p>,
    );
  });

  flushList(lines.length);

  return <div className={`space-y-1 ${className}`}>{blocks}</div>;
}
