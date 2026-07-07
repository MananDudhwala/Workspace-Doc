const { TiptapTransformer } = require('@hocuspocus/transformer');
const { generateJSON } = require('@tiptap/html');
const StarterKit = require('@tiptap/starter-kit').default;
const extensions = [StarterKit];

const html = "<p>Hello <strong>World</strong>!</p>";
console.log("HTML:", html);

const json = generateJSON(html, extensions);
console.log("JSON:", JSON.stringify(json));

const ydoc = TiptapTransformer.toYdoc(json, 'default', extensions);
console.log("YDOC works!", ydoc.getText('default').length !== undefined);
