import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Children } from 'react';

export function Markdown({ children }: { children: string }) {
  const text = children.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, id, label) => `[${label || id}](#${id})`);
  return <div className="wiki-prose"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
    table: ({ children }) => <div className="table-scroll"><table>{children}</table></div>,
    p: ({ children }) => {
      const parts = Children.toArray(children);
      const first = parts[0];
      const tag = typeof first === 'string' ? first.match(/^\[!(提示|待核实|注意)\]\s*/) : null;
      return tag ? <p><strong className="callout-label">{tag[1]}</strong>{String(first).slice(tag[0].length)}{parts.slice(1)}</p> : <p>{children}</p>;
    },
    a: ({ href, children }) => <a href={href} {...(href?.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}</a>,
  }}>{text}</ReactMarkdown></div>;
}
