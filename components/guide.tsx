'use client';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Markdown } from './markdown';

export function Guide({ text, onClose }: { text: string; onClose: () => void }) {
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="guide-dialog"><DialogTitle>一起维护上财 Wiki</DialogTitle><DialogDescription>改正一处信息，也是一次有用的贡献。</DialogDescription><Markdown>{text}</Markdown></DialogContent></Dialog>;
}
