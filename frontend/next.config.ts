import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    '@tiptap/react',
    '@tiptap/extension-collaboration',
    '@tiptap/extension-collaboration-cursor',
    '@tiptap/y-tiptap',
    'y-prosemirror',
    'yjs',
    'y-protocols'
  ],
};

export default nextConfig;
