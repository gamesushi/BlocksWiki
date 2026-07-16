'use client';

/**
 * Block 链接内联工具（替代 @editorjs/link）。
 *
 * 用法：在段落里选中一段文字 → 点工具栏的「🔗 Block」→ 弹出搜索框，搜出目标 block 后点选，
 * 即把选中文字包成 <a href="/block/<id>">。保存时 reconcile 会自动扫描正文里的
 * /block/<id> 链接、建出 block→block 的 Connection 边并记反链。
 *
 * 这样作者无需手敲 /block/<id>，也不会写错，且链接始终走内部 block 解析（不发起外部 fetch）。
 */
import type { API, InlineTool, InlineToolConstructorOptions } from '@editorjs/editorjs';
import { searchBlocks } from '@/app/actions/search';

type PickItem = { documentId: string; label: string };

export class BlockLinkInlineTool implements InlineTool {
  static get isInline(): boolean {
    return true;
  }

  private api: API;
  private savedRange: Range | null = null;
  private panel: HTMLDivElement | null = null;

  constructor({ api }: InlineToolConstructorOptions) {
    this.api = api;
  }

  render(): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('ce-inline-tool');
    button.textContent = '🔗 Block';
    button.title = '链接到 block';
    return button;
  }

  /** 允许 inline 产生的 <a> 在保存时保留（Editor.js 从工具构造器读取静态 sanitize 属性） */
  static sanitize = { a: { href: true } };

  /**
   * 工具栏按钮被点击、且当前有选中文字时触发。
   * 此时编辑器选区仍在，先克隆 DOM Range 留存，再弹搜索面板。
   */
  surround(range: Range | null): void {
    if (!range) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const domRange = sel.getRangeAt(0);
    if (domRange.collapsed) return; // 必须选中文字才弹面板
    this.savedRange = domRange.cloneRange();
    this.openPanel();
  }

  private openPanel(): void {
    this.closePanel();
    const range = this.savedRange!;
    const rect = range.getBoundingClientRect();

    const panel = document.createElement('div');
    panel.style.cssText = [
      'position:absolute',
      'z-index:1000',
      `top:${window.scrollY + rect.bottom + 6}px`,
      `left:${window.scrollX + rect.left}px`,
      'width:280px',
      'max-width:90vw',
      'background:#fff',
      'border:1px solid #e5e5e5',
      'border-radius:8px',
      'box-shadow:0 4px 16px rgba(0,0,0,0.12)',
      'padding:8px',
      'font-size:13px',
    ].join(';');

    const input = document.createElement('input');
    input.placeholder = '搜索 block…';
    input.style.cssText =
      'width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #ddd;border-radius:6px;outline:none;';

    const list = document.createElement('ul');
    list.style.cssText = 'margin:6px 0 0;padding:0;list-style:none;max-height:220px;overflow-y:auto;';

    panel.appendChild(input);
    panel.appendChild(list);
    document.body.appendChild(panel);
    this.panel = panel;

    const renderResults = (items: PickItem[]) => {
      list.innerHTML = '';
      if (items.length === 0) {
        const li = document.createElement('li');
        li.textContent = '没有匹配的 block';
        li.style.cssText = 'color:#aaa;padding:6px 4px;';
        list.appendChild(li);
        return;
      }
      items.forEach((it) => {
        const li = document.createElement('li');
        li.textContent = it.label;
        li.style.cssText =
          'padding:6px 4px;cursor:pointer;border-radius:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        li.addEventListener('mouseenter', () => (li.style.background = '#f5f5f5'));
        li.addEventListener('mouseleave', () => (li.style.background = 'transparent'));
        li.addEventListener('mousedown', (e) => {
          e.preventDefault(); // 保留编辑器里的选中，避免失焦后选区丢失
          this.applyLink(it.documentId);
        });
        list.appendChild(li);
      });
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    input.addEventListener('input', () => {
      if (timer) clearTimeout(timer);
      const q = input.value.trim();
      timer = setTimeout(async () => {
        if (!q) {
          renderResults([]);
          return;
        }
        try {
          const res = await searchBlocks(q, 1);
          renderResults(
            res.blocks.map((b) => ({
              documentId: b.documentId,
              label: (b.excerpt || '(空 block)').slice(0, 60),
            })),
          );
        } catch {
          renderResults([]);
        }
      }, 250);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.closePanel();
      }
    });

    document.addEventListener('mousedown', this.onOutsideClick);
    input.focus();
  }

  private onOutsideClick = (e: MouseEvent): void => {
    if (this.panel && !this.panel.contains(e.target as Node)) {
      this.closePanel();
    }
  };

  /** 选中结果后：恢复编辑器选区 → 用 createLink 把选中文字包成 <a href="/block/<id>"> */
  private applyLink(documentId: string): void {
    const href = `/block/${documentId}`;
    const range = this.savedRange;
    this.closePanel();
    if (!range) return;

    // 让选区所在的 block contenteditable 重新获得焦点，execCommand 才能写入
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const editable = (node as Element | null)?.closest?.('.ce-block__content') as HTMLElement | null;
    editable?.focus();

    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    document.execCommand('createLink', false, href);

    const it = this.api.inlineToolbar as unknown as { close?: () => void };
    it.close?.();
  }

  private closePanel(): void {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
      document.removeEventListener('mousedown', this.onOutsideClick);
    }
  }
}
