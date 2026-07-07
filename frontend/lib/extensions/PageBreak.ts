import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}

export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  selectable: true,
  draggable: true,

  parseHTML() {
    return [
      { tag: 'hr[data-type="pageBreak"]' },
      { tag: 'div[style*="page-break-after: always"]' }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'hr',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'pageBreak',
        class: 'page-break-line my-12 border-t-4 border-dashed border-muted/50 w-full relative after:content-["Page_Break"] after:absolute after:-top-3 after:left-1/2 after:-translate-x-1/2 after:bg-card after:px-4 after:text-xs after:text-muted-foreground after:uppercase after:font-bold after:tracking-widest'
      }),
    ];
  },

  addCommands() {
    return {
      setPageBreak: () => ({ chain }) => {
        return chain()
          .insertContent({ type: this.name })
          .run();
      },
    };
  },
});
