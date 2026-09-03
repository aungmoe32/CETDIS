"use client";

import { useState, useRef } from "react";
import RichTextView from "./rich-text-view";

interface Props {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
}

export default function RichTextEditor({
  name = "description",
  defaultValue = "",
  placeholder = "Describe event schedule, special instructions, dress code, speaker line-up, or FAQs...",
  label = "Event Description",
}: Props) {
  const [content, setContent] = useState(defaultValue);
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const insertFormat = (before: string, after: string = "", defaultPlaceholder: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end) || defaultPlaceholder;

    const replacement = `${before}${selectedText}${after}`;
    const newContent =
      textarea.value.substring(0, start) + replacement + textarea.value.substring(end);

    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length,
      );
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "b") {
      e.preventDefault();
      insertFormat("**", "**", "bold text");
    } else if ((e.metaKey || e.ctrlKey) && e.key === "i") {
      e.preventDefault();
      insertFormat("*", "*", "italic text");
    } else if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      insertFormat("[", "](https://example.com)", "link title");
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={name} className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
          {label}
        </label>
        {/* Tab switch between Write and Preview */}
        <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={`px-2.5 py-1 rounded-md transition ${
              activeTab === "write"
                ? "bg-white text-indigo-700 font-semibold shadow-2xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`px-2.5 py-1 rounded-md transition ${
              activeTab === "preview"
                ? "bg-white text-indigo-700 font-semibold shadow-2xs"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-300 bg-white overflow-hidden shadow-2xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition">
        {/* Formatting Toolbar */}
        {activeTab === "write" && (
          <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-gray-100 bg-gray-50/70 overflow-x-auto scrollbar-none">
            {/* Bold */}
            <button
              type="button"
              onClick={() => insertFormat("**", "**", "bold text")}
              className="p-1.5 rounded-lg text-gray-600 hover:bg-white hover:text-gray-900 transition"
              title="Bold (Ctrl+B)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
              </svg>
            </button>

            {/* Italic */}
            <button
              type="button"
              onClick={() => insertFormat("*", "*", "italic text")}
              className="p-1.5 rounded-lg text-gray-600 hover:bg-white hover:text-gray-900 transition"
              title="Italic (Ctrl+I)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 4h4m-2 0l-4 16m2 0h4" />
              </svg>
            </button>

            <span className="w-px h-4 bg-gray-200 mx-0.5" />

            {/* Heading 2 */}
            <button
              type="button"
              onClick={() => insertFormat("## ", "", "Heading")}
              className="p-1.5 rounded-lg text-xs font-bold text-gray-600 hover:bg-white hover:text-gray-900 transition"
              title="Heading 2"
            >
              H2
            </button>

            {/* Heading 3 */}
            <button
              type="button"
              onClick={() => insertFormat("### ", "", "Subheading")}
              className="p-1.5 rounded-lg text-xs font-bold text-gray-600 hover:bg-white hover:text-gray-900 transition"
              title="Heading 3"
            >
              H3
            </button>

            <span className="w-px h-4 bg-gray-200 mx-0.5" />

            {/* Bullet list */}
            <button
              type="button"
              onClick={() => insertFormat("- ", "", "List item")}
              className="p-1.5 rounded-lg text-gray-600 hover:bg-white hover:text-gray-900 transition"
              title="Bullet List"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16M2 6h.01M2 12h.01M2 18h.01" />
              </svg>
            </button>

            {/* Numbered list */}
            <button
              type="button"
              onClick={() => insertFormat("1. ", "", "Numbered item")}
              className="p-1.5 rounded-lg text-gray-600 hover:bg-white hover:text-gray-900 transition"
              title="Numbered List"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 6h13M7 12h13M7 18h13M3 6h1v4M3 14h2v2H3v2h2" />
              </svg>
            </button>

            {/* Blockquote */}
            <button
              type="button"
              onClick={() => insertFormat("> ", "", "Important quote")}
              className="p-1.5 rounded-lg text-gray-600 hover:bg-white hover:text-gray-900 transition"
              title="Quote"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>

            {/* Link */}
            <button
              type="button"
              onClick={() => insertFormat("[", "](https://...)", "link text")}
              className="p-1.5 rounded-lg text-gray-600 hover:bg-white hover:text-gray-900 transition"
              title="Insert Link (Ctrl+K)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
          </div>
        )}

        {/* Editor Body */}
        {activeTab === "write" ? (
          <textarea
            ref={textareaRef}
            id={name}
            name={name}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={5}
            placeholder={placeholder}
            className="w-full px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-y min-h-[120px]"
          />
        ) : (
          <div className="p-3.5 min-h-[120px] bg-gray-50/40">
            {content.trim() ? (
              <RichTextView content={content} />
            ) : (
              <p className="text-xs text-gray-400 italic">No description written yet.</p>
            )}
            {/* Include hidden input in preview mode so form submission always submits the content */}
            <input type="hidden" name={name} value={content} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
        <span>Markdown supported (headings, lists, links, bold, italic)</span>
        <span>{content.length} characters</span>
      </div>
    </div>
  );
}
