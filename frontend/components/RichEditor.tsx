'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Toggle } from '@/components/ui/toggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  Bold, Italic, Underline as UnderlineIcon, 
  List, ListOrdered, AlignLeft, AlignCenter, 
  Quote, Undo, Redo 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichEditorProps {
  content: string;
  onChange?: (html: string) => void;
  readonly?: boolean;
  placeholder?: string;
}

export function RichEditor({ content, onChange, readonly = false, placeholder }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({
        placeholder: placeholder || 'Start writing your document...',
      }),
    ],
    content,
    editable: !readonly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    immediatelyRender: false,
  });

  if (!editor) return null;

  const setHeading = (level: string | null) => {
    if (!level) return;
    if (level === "0") {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level: parseInt(level) as 1|2|3 }).run();
    }
  };

  const currentHeading = () => {
    if (editor.isActive('heading', { level: 1 })) return "1";
    if (editor.isActive('heading', { level: 2 })) return "2";
    if (editor.isActive('heading', { level: 3 })) return "3";
    return "0";
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      {!readonly && (
        <div className="flex items-center gap-1.5 px-4 py-2 bg-background border-b overflow-x-auto min-h-[52px]">
          {/* Heading selector */}
          <Select value={currentHeading()} onValueChange={setHeading}>
            <SelectTrigger className="w-[130px] h-8 flex-shrink-0">
              <SelectValue placeholder="Text style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Normal text</SelectItem>
              <SelectItem value="1">Heading 1</SelectItem>
              <SelectItem value="2">Heading 2</SelectItem>
              <SelectItem value="3">Heading 3</SelectItem>
            </SelectContent>
          </Select>

          <div className="w-[1px] h-6 bg-border mx-1" />

          <Toggle
            size="sm"
            pressed={editor.isActive('bold')}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            aria-label="Toggle bold"
            title="Bold (⌘B)"
          >
            <Bold size={16} />
          </Toggle>

          <Toggle
            size="sm"
            pressed={editor.isActive('italic')}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            aria-label="Toggle italic"
            title="Italic (⌘I)"
          >
            <Italic size={16} />
          </Toggle>

          <Toggle
            size="sm"
            pressed={editor.isActive('underline')}
            onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
            aria-label="Toggle underline"
            title="Underline (⌘U)"
          >
            <UnderlineIcon size={16} />
          </Toggle>

          <div className="w-[1px] h-6 bg-border mx-1" />

          <Toggle
            size="sm"
            pressed={editor.isActive('bulletList')}
            onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
            aria-label="Toggle bullet list"
            title="Bullet list"
          >
            <List size={16} />
          </Toggle>

          <Toggle
            size="sm"
            pressed={editor.isActive('orderedList')}
            onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
            aria-label="Toggle ordered list"
            title="Numbered list"
          >
            <ListOrdered size={16} />
          </Toggle>

          <div className="w-[1px] h-6 bg-border mx-1" />

          <Toggle
            size="sm"
            pressed={editor.isActive({ textAlign: 'left' })}
            onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
            aria-label="Align left"
            title="Align left"
          >
            <AlignLeft size={16} />
          </Toggle>

          <Toggle
            size="sm"
            pressed={editor.isActive({ textAlign: 'center' })}
            onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
            aria-label="Align center"
            title="Align center"
          >
            <AlignCenter size={16} />
          </Toggle>

          <div className="w-[1px] h-6 bg-border mx-1" />

          <Toggle
            size="sm"
            pressed={editor.isActive('blockquote')}
            onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
            aria-label="Toggle blockquote"
            title="Blockquote"
          >
            <Quote size={16} />
          </Toggle>

          <div className="w-[1px] h-6 bg-border mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="w-8 h-8 p-0"
            title="Undo (⌘Z)"
          >
            <Undo size={16} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="w-8 h-8 p-0"
            title="Redo (⌘⇧Z)"
          >
            <Redo size={16} />
          </Button>
        </div>
      )}

      {/* Editor area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-y-auto px-4 md:px-12 py-8 bg-muted/20 items-center">
          <div className={cn(
            "w-full max-w-4xl bg-card text-card-foreground shadow-sm rounded-xl min-h-full border",
            readonly && "bg-transparent shadow-none border-none"
          )}>
            <EditorContent 
              editor={editor} 
              className={cn("p-8 md:p-16 prose prose-invert max-w-none focus:outline-none h-full", readonly && "p-0 md:p-8")} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
