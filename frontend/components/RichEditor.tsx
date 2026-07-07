'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { Toggle } from '@/components/ui/toggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Bold, Italic, Underline as UnderlineIcon, 
  List, ListOrdered, AlignLeft, AlignCenter, 
  Quote, Undo, Redo, FileMinus,
  Image as ImageIcon, Link as LinkIcon, Video as YoutubeIcon, Loader2
} from 'lucide-react';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import { uploadMedia } from '@/lib/api';
import { PageBreak } from '@/lib/extensions/PageBreak';
import { cn } from '@/lib/utils';

interface RichEditorProps {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  user: { id: string; name: string; color: string; email: string; initials: string };
  readonly?: boolean;
  placeholder?: string;
}

export function RichEditor({ ydoc, provider, user, readonly = false, placeholder }: RichEditorProps) {
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
      PageBreak,
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider,
        user: user,
      }),
      Image,
      Link.configure({
        openOnClick: true,
        autolink: true,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer decoration-primary/50 hover:decoration-primary transition-colors',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Youtube.configure({
        inline: false,
      }),
    ],
    editable: !readonly,
  });

  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [linkModalOpen, setLinkModalOpen] = React.useState(false);
  const [linkInput, setLinkInput] = React.useState('');
  
  const [youtubeModalOpen, setYoutubeModalOpen] = React.useState(false);
  const [youtubeInput, setYoutubeInput] = React.useState('');

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingImage(true);
      const res = await uploadMedia(file);
      editor.chain().focus().setImage({ src: res.url }).run();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openLinkModal = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkInput(previousUrl);
    setLinkModalOpen(true);
  };

  const applyLink = () => {
    if (linkInput === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      const validUrl = /^https?:\/\//.test(linkInput) ? linkInput : `https://${linkInput}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href: validUrl }).run();
    }
    setLinkModalOpen(false);
  };

  const openYoutubeModal = () => {
    setYoutubeInput('');
    setYoutubeModalOpen(true);
  };

  const applyYoutube = () => {
    if (youtubeInput) {
      editor.commands.setYoutubeVideo({ src: youtubeInput, width: 640, height: 480 });
    }
    setYoutubeModalOpen(false);
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

          <Toggle
            size="sm"
            pressed={editor.isActive('link')}
            onPressedChange={openLinkModal}
            aria-label="Add link"
            title="Add link"
          >
            <LinkIcon size={16} />
          </Toggle>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
            className="w-8 h-8 p-0"
            title="Upload Image"
          >
            {isUploadingImage ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />}
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />

          <Button
            variant="ghost"
            size="sm"
            onClick={openYoutubeModal}
            className="w-8 h-8 p-0"
            title="Add YouTube Video"
          >
            <YoutubeIcon size={16} />
          </Button>

          <div className="w-[1px] h-6 bg-border mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setPageBreak().run()}
            className="w-8 h-8 p-0"
            title="Insert Page Break"
          >
            <FileMinus size={16} />
          </Button>

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
            "w-full shrink-0 editor-a4-pages",
            "max-w-[210mm] min-h-[297mm]",
            readonly && "bg-transparent shadow-none border-none filter-none"
          )}>
            <EditorContent 
              editor={editor} 
              className={cn(
                "p-[20mm] md:p-[25.4mm] prose prose-invert max-w-none focus:outline-none h-full break-words", 
                readonly && "p-0 md:p-[20mm]"
              )} 
            />
          </div>
        </div>
      </div>
      
      {/* Link Modal */}
      <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                placeholder="https://example.com"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyLink(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkModalOpen(false)}>Cancel</Button>
            <Button onClick={applyLink}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* YouTube Modal */}
      <Dialog open={youtubeModalOpen} onOpenChange={setYoutubeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert YouTube Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube URL</Label>
              <Input
                id="youtube-url"
                placeholder="https://youtube.com/watch?v=..."
                value={youtubeInput}
                onChange={(e) => setYoutubeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyYoutube(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setYoutubeModalOpen(false)}>Cancel</Button>
            <Button onClick={applyYoutube}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
