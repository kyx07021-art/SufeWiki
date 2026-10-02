'use client';

import { useEffect, useRef, useState } from 'react';
import { Bold, Link as LinkIcon, List, Table2, Quote, Heading2, LoaderCircle, Send, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Markdown } from './markdown';
import { flattenTree, normalizeMarkdown, wikiTree, type Section } from '@/lib/wiki';

interface Draft { title: string; body: string; revision: number; parentId: string | null }

export function Editor({ section, sections, onClose, onPublished }: {
  section: Section | null; sections: Section[]; onClose: () => void; onPublished: (section: Section) => void;
}) {
  const draftKey = `sufe-wiki:draft:${section?.id ?? 'new'}`;
  const [draft, setDraft] = useState<Draft>(() => JSON.parse(localStorage.getItem(draftKey) || 'null') || {
    title: section?.title ?? '', body: section?.body ?? '', revision: section?.revision ?? 0, parentId: section?.parentId ?? sections[0].id,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [latest, setLatest] = useState<Section | null>(null);
  const [tab, setTab] = useState('write');
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { localStorage.setItem(draftKey, JSON.stringify(draft)); }, [draft, draftKey]);

  function insert(before: string, after = '') {
    const area = textarea.current!;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const selection = draft.body.slice(start, end);
    setDraft({ ...draft, body: draft.body.slice(0, start) + before + selection + after + draft.body.slice(end) });
    requestAnimationFrame(() => { area.focus(); area.setSelectionRange(start + before.length, end + before.length); });
  }

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(section ? `/api/sections/${section.id}` : '/api/sections', {
        method: section ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
      });
      if (response.status === 409) {
        const current = await fetch('/api/sections').then(result => result.json()) as { sections: Section[] };
        setLatest(current.sections.find((item: Section) => item.id === section!.id)!);
        setError('其他同学已更新此条目。你的草稿已保留，请对照下方最新内容合并。');
        return;
      }
      if (!response.ok) throw new Error('发布失败，请稍后重试。你的草稿保留在这台设备上。');
      const result = await response.json() as { section: Section };
      localStorage.removeItem(draftKey);
      onPublished(result.section);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '网络连接失败，请重试。');
    } finally { setBusy(false); }
  }

  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="editor-dialog" onInteractOutside={event => event.preventDefault()}>
      <DialogTitle className="editor-title">{section ? '编辑条目' : '新增条目'}</DialogTitle>
      <DialogDescription>写下可靠的信息，发布后立即生效。草稿自动保存在当前设备。</DialogDescription>
      <form onSubmit={publish} className="editor-form">
        <div className="editor-fields"><label>条目标题<input required maxLength={100} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="例如：图书馆借阅" /></label>
          {!section && <label>所属目录<NativeSelect value={draft.parentId ?? ''} onChange={event => setDraft({ ...draft, parentId: event.target.value || null })}><NativeSelectOption value="">新建一级主题</NativeSelectOption>{flattenTree(wikiTree(sections)).filter(item => item.depth < 4).map(item => <NativeSelectOption key={item.id} value={item.id}>{'　'.repeat(item.depth)}{item.title}</NativeSelectOption>)}</NativeSelect></label>}
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <div className="editor-tabs"><TabsList variant="line"><TabsTrigger value="write">编辑</TabsTrigger><TabsTrigger value="preview">预览</TabsTrigger></TabsList><span>{draft.body.length.toLocaleString()} / 100,000 字符</span></div>
          <TabsContent value="write">
            <div className="format-toolbar">
              <button type="button" title="加粗" onClick={() => insert('**', '**')}><Bold size={16} /></button>
              <button type="button" title="小标题" onClick={() => insert('\n## ')}><Heading2 size={16} /></button>
              <button type="button" title="链接" onClick={() => insert('[', '](https://)')}><LinkIcon size={16} /></button>
              <button type="button" title="列表" onClick={() => insert('\n1. ')}><List size={16} /></button>
              <button type="button" title="表格" onClick={() => insert('\n| 项目 | 说明 |\n| --- | --- |\n| 内容 | 内容 |\n')}><Table2 size={16} /></button>
              <button type="button" title="提示" onClick={() => insert('\n> [!提示] ')}><Quote size={16} /></button>
              <button type="button" title="来源模板" onClick={() => insert('\n\n适用范围：待补充\n\n来源：[通知标题](https://)\n\n最后核对：待核实\n')}><FileText size={16} /><span>来源</span></button>
            </div>
            <textarea ref={textarea} aria-label="条目正文 Markdown" className="markdown-input" maxLength={100000} value={draft.body} onChange={event => setDraft({ ...draft, body: event.target.value })} placeholder="写下信息、办理步骤和来源。支持 Markdown 表格、列表、链接和提示块。" />
          </TabsContent>
          <TabsContent value="preview"><div className="editor-preview"><h2>{draft.title || '未命名条目'}</h2>{draft.body ? <Markdown>{normalizeMarkdown(draft.body)}</Markdown> : <p>输入正文后在这里查看排版。</p>}</div></TabsContent>
        </Tabs>
        {error && <p className="editor-error" role="alert">{error}</p>}
        {latest && <div className="conflict-box"><details open><summary>最新已发布内容（版本 {latest.revision}）</summary><h3>{latest.title}</h3><Markdown>{latest.body}</Markdown></details><button type="button" onClick={() => { setDraft({ ...draft, revision: latest.revision }); setLatest(null); setError(''); }}>我已在编辑框合并内容，重新发布</button></div>}
        <div className="editor-actions"><span>关闭窗口仍保留草稿</span><button type="button" className="secondary-button" onClick={onClose} disabled={busy}>暂存并关闭</button><button type="submit" className="primary-button" disabled={busy || !!latest || !draft.title.trim()}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={14} />}{busy ? '正在发布…' : '直接发布'}</button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
