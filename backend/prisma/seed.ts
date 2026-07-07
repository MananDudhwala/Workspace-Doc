import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await bcrypt.hash('demo1234', 10);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@demo.com' },
    update: {},
    create: {
      email: 'alice@demo.com',
      name: 'Alice Johnson',
      password: hashedPassword,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@demo.com' },
    update: {},
    create: {
      email: 'bob@demo.com',
      name: 'Bob Smith',
      password: hashedPassword,
    },
  });

  // Create a sample document for Alice
  const doc1 = await prisma.document.upsert({
    where: { id: 'seed-doc-1' },
    update: {},
    create: {
      id: 'seed-doc-1',
      title: 'Welcome to WorkspaceDoc',
      content: `<h1>Welcome to WorkspaceDoc 🎉</h1><p>This is a <strong>rich-text document editor</strong> with the following features:</p><ul><li><strong>Bold</strong>, <em>Italic</em>, <u>Underline</u> formatting</li><li>Headings (H1, H2, H3)</li><li>Bullet and numbered lists</li><li>Auto-save as you type</li></ul><h2>Getting Started</h2><p>Click anywhere to start editing. Your changes are saved automatically.</p><h2>Sharing</h2><p>Use the <strong>Share</strong> button in the toolbar to share this document with other users. You can grant <em>Read</em> or <em>Edit</em> access.</p>`,
      ownerId: alice.id,
    },
  });

  // Share doc1 with Bob (edit access)
  await prisma.documentShare.upsert({
    where: { documentId_userId: { documentId: doc1.id, userId: bob.id } },
    update: {},
    create: {
      documentId: doc1.id,
      userId: bob.id,
      role: 'edit',
    },
  });

  // Create a second doc for Alice
  await prisma.document.upsert({
    where: { id: 'seed-doc-2' },
    update: {},
    create: {
      id: 'seed-doc-2',
      title: 'Project Notes',
      content: `<h1>Project Notes</h1><p>Use this document to track your project progress.</p><ol><li>Define requirements</li><li>Design architecture</li><li>Implement features</li><li>Write tests</li><li>Deploy</li></ol>`,
      ownerId: alice.id,
    },
  });

  // Create a doc for Bob
  await prisma.document.upsert({
    where: { id: 'seed-doc-3' },
    update: {},
    create: {
      id: 'seed-doc-3',
      title: "Bob's Personal Notes",
      content: `<h1>My Notes</h1><p>This is Bob's private document. Only Bob can see this unless shared.</p>`,
      ownerId: bob.id,
    },
  });

  console.log('✅ Seed complete!');
  console.log('');
  console.log('Demo accounts:');
  console.log('  alice@demo.com / demo1234');
  console.log('  bob@demo.com   / demo1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
