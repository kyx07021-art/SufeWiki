'use client';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Markdown } from './markdown';

export function Guide({ text, onClose }: { text: string; onClose: () => void }) {
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="guide-dialog"><DialogTitle>贡献指南</DialogTitle><DialogDescription>上财 Wiki 由学生共同维护，任何同学都可以补充和修正内容。</DialogDescription><Markdown>{text}</Markdown></DialogContent></Dialog>;
}
