'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { BookOpen, ChevronRight, Search, PenLine, Plus, ArrowUpRight, GraduationCap, Link as LinkIcon, Download } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Markdown } from './markdown';
import { Editor } from './editor';
import { Guide } from './guide';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import guideText from '@/content/contributing.md?raw';
import { exportMarkdown, flattenTree, wikiTree, type Section, type WikiNode } from '@/lib/wiki';

function Outline({ nodes, active, query }: { nodes: WikiNode[]; active: string; query: string }) {
  const { setOpenMobile } = useSidebar();
  return <ul className="wiki-outline">{nodes.map(node => <li key={node.id}>
    {node.children.length ? <details open={node.depth === 0 || !!query}>
      <summary><ChevronRight size={13} /><a href={`#${node.id}`} className={active === node.id ? 'current' : ''} onClick={() => setOpenMobile(false)}>{node.title}</a><span>{node.children.length}</span></summary>
      <Outline nodes={node.children} active={active} query={query} />
    </details> : <a href={`#${node.id}`} className={`outline-leaf ${active === node.id ? 'current' : ''}`} onClick={() => setOpenMobile(false)}><span className={`entry-dot ${node.body ? 'filled' : ''}`} />{node.title}</a>}
  </li>)}</ul>;
}

function SearchResults({ matches, onSelect }: { matches: WikiNode[]; onSelect: () => void }) {
  const { setOpenMobile } = useSidebar();
  return <ul className="search-results">{matches.map(section => <li key={section.id}><a href={`#${section.id}`} onClick={() => { onSelect(); setOpenMobile(false); }}>{section.title}<small>{section.body.replace(/[>#|*]/g, '').slice(0, 65) || '等待同学补充'}</small></a></li>)}{!matches.length && <li className="no-results">没有找到相关条目，换个关键词试试。</li>}</ul>;
}

function AddEntry({ onClick }: { onClick: () => void }) {
  const { setOpenMobile } = useSidebar();
  return <button className="add-entry" onClick={() => { setOpenMobile(false); onClick(); }}><Plus size={15} />新增条目</button>;
}

export function Wiki({ initialSections }: { initialSections: Section[] }) {
  const [sections, setSections] = useState(initialSections);
  const [editing, setEditing] = useState<Section | 'new' | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(sections[0].id);
  const tree = useMemo(() => wikiTree(sections), [sections]);
  const flat = useMemo(() => flattenTree(tree), [tree]);
  const matches = flat.filter(section => `${section.title}\n${section.body}`.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (event.key === '/' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('.search-box input')?.focus();
      }
    }
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);
  useEffect(() => {
    const context = document.modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    context.registerTool({
      name: 'search_wiki', title: '搜索上财 Wiki', description: '搜索已发布的目录和正文，返回条目 ID、标题与摘要。',
      inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute({ query }) {
        if (typeof query !== 'string') throw new Error('query 必须是字符串');
        setQuery(query);
        return sections.filter(item => `${item.title}\n${item.body}`.includes(query)).map(item => ({ id: item.id, title: item.title, excerpt: item.body.slice(0, 180) }));
      },
    }, { signal: lifecycle.signal });
    context.registerTool({
      name: 'start_edit_section', title: '打开条目编辑器', description: '打开指定条目的编辑器。此操作不发布内容。',
      inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute({ id }) {
        const section = sections.find(item => item.id === id);
        if (!section) throw new Error('条目不存在');
        setEditing(section);
        return { id, state: 'editor_open' };
      },
    }, { signal: lifecycle.signal });
    return () => lifecycle.abort();
  }, [sections]);

  function published(section: Section) {
    setSections(current => current.some(item => item.id === section.id) ? current.map(item => item.id === section.id ? section : item) : [...current, section]);
    setEditing(null);
    toast.success('已发布，所有读者可看到你的修改');
    requestAnimationFrame(() => { window.location.hash = section.id; });
  }

  function download() {
    const url = URL.createObjectURL(new Blob([exportMarkdown(sections)], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = '上财Wiki.md'; link.click();
    URL.revokeObjectURL(url);
  }
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const entry = entries.find(item => item.isIntersecting);
      if (entry) setActive(entry.target.id);
    }, { rootMargin: '-90px 0px -70% 0px' });
    document.querySelectorAll('[data-wiki-section]').forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [sections]);

  return <SidebarProvider style={{ '--sidebar-width': '304px' } as CSSProperties}>
    <a href="#wiki-content" className="skip-link">跳转到正文</a>
    <Sidebar className="wiki-sidebar">
      <SidebarHeader className="brand-area"><a className="brand" href="#"><span className="brand-mark">财</span><span>上财 Wiki<small>SUFE · STUDENT WIKI</small></span></a><p>把校园经验，留给下一个你。</p></SidebarHeader>
      <div className="search-box"><Search size={16} /><input aria-label="搜索目录与正文" placeholder="搜索目录与正文…" value={query} onChange={event => setQuery(event.target.value)} /><kbd>/</kbd></div>
      <div className="outline-label"><span>{query ? `搜索结果 · ${matches.length}` : '内容目录'}</span><BookOpen size={14} /></div>
      <SidebarContent className="outline-scroll">{query ? <SearchResults matches={matches} onSelect={() => setQuery('')} /> : <Outline nodes={tree} active={active} query={query} />}</SidebarContent>
      <SidebarFooter className="sidebar-note"><AddEntry onClick={() => setEditing('new')} /><span className="community-dot" />学生共建 · 持续更新<small>非学校官方网站</small></SidebarFooter>
    </Sidebar>
    <main id="wiki-content" className="wiki-main">
      <header className="topbar"><div><SidebarTrigger aria-label="展开或收起目录" /><span>校园知识库</span><ChevronRight size={13} /><span className="breadcrumb-current">{sections.find(section => section.id === active)?.title}</span></div><button className="guide-link" onClick={() => setShowGuide(true)}>贡献指南 <ArrowUpRight size={14} /></button></header>
      <div className="reading-surface">
        <div className="document-intro"><div className="eyebrow"><GraduationCap size={15} />上海财经大学 · 学生共建</div><h1>上财生活，从这里查起。</h1><p>学习、生活、成长机会。把散落的经验整理在一起，让有用的信息更容易找到。</p><div className="document-meta"><span>{tree.length} 个主题</span><i /><span>{sections.length} 个条目</span><i /><span>任何同学都可以贡献</span></div></div>
        <div className="reader-notice"><BookOpen size={18} /><p><strong>一份一起写的校园手册</strong><br />点击左侧目录定位，或向下连续阅读。空白条目等待你的经验。</p><button className="guide-link" onClick={() => setShowGuide(true)}>了解如何贡献 <ChevronRight size={14} /></button></div>
        <article>{flat.map(section => {
          const Heading = `h${Math.min(section.depth + 2, 6)}` as 'h2';
          return <section key={section.id} id={section.id} data-wiki-section className={`wiki-section depth-${section.depth} ${!section.body && !section.children.length ? 'empty-section' : ''}`}>
            <div className="section-title"><Heading>{section.title}</Heading><div className="section-actions"><button className="anchor-link" title={`复制${section.title}的链接`} onClick={() => navigator.clipboard.writeText(`${location.origin}/#${section.id}`).then(() => toast.success('条目链接已复制')).catch(() => toast.error('复制失败，可复制浏览器中的条目地址'))}><LinkIcon size={12} /></button><button className="edit-link" title={`编辑${section.title}`} onClick={() => setEditing(section)}><PenLine size={13} />编辑</button></div></div>
            {section.body ? <Markdown>{section.body}</Markdown> : !section.children.length && <p className="empty-copy">待补充 <span>· 欢迎分享你的经验</span></p>}
          </section>;
        })}</article>
        <footer id="contribute" className="contribution-card"><Plus size={23} /><div><h2>这份 Wiki，缺的可能就是你的经验。</h2><p>从补充一个链接、修正一句说明开始。编辑后直接发布，共同维护。</p><button onClick={() => setEditing('new')}>补充一个条目 <ArrowUpRight size={13} /></button></div></footer>
        <div className="page-footer"><span>上财 Wiki · 由学生共同维护</span><button onClick={download}><Download size={12} />下载正文</button><a href="#">回到顶部 ↑</a></div>
      </div>
    </main>
    {editing && <Editor key={editing === 'new' ? 'new' : editing.id} section={editing === 'new' ? null : editing} sections={sections} onClose={() => setEditing(null)} onPublished={published} />}
    {showGuide && <Guide text={guideText} onClose={() => setShowGuide(false)} />}
    <Toaster position="bottom-right" theme="light" />
  </SidebarProvider>;
}

