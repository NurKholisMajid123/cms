import express from 'express';
import payload from 'payload';
import { config } from 'dotenv';
import path from 'path';

config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS (jika dibutuhkan untuk frontend terpisah)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const start = async () => {
  // Initialize Payload
  await payload.init({
    secret: process.env.PAYLOAD_SECRET || 'your-secret-key-here',
    express: app,
    onInit: async () => {
      payload.logger.info(`Payload CMS initialized`);
      payload.logger.info(`Admin URL: ${payload.getAdminURL()}`);
    },
  });

  // ============================================
  // PUBLIC FRONTEND API ROUTES
  // ============================================

  // ============================================
  // 1. ORGANIZATION STRUCTURE (Struktur Organisasi)
  // ============================================

  // Get active period
  app.get('/api/public/period/active', async (req, res) => {
    try {
      const period = await payload.find({
        collection: 'periods',
        where: { isActive: { equals: true } },
        limit: 1,
      });

      if (period.docs.length === 0) {
        return res.status(404).json({ error: 'No active period found' });
      }

      res.json(period.docs[0]);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching active period' });
    }
  });

  // Get all periods
  app.get('/api/public/periods', async (req, res) => {
    try {
      const periods = await payload.find({
        collection: 'periods',
        sort: '-startDate',
      });
      res.json(periods);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching periods' });
    }
  });

  // Get organization structure by period
  app.get('/api/public/structure/:periodId?', async (req, res) => {
    try {
      let periodId = req.params.periodId;

      // If no period specified, get active period
      if (!periodId) {
        const activePeriod = await payload.find({
          collection: 'periods',
          where: { isActive: { equals: true } },
          limit: 1,
        });

        if (activePeriod.docs.length === 0) {
          return res.status(404).json({ error: 'No active period found' });
        }
        periodId = activePeriod.docs[0].id;
      }

      // Get positions for this period
      const positions = await payload.find({
        collection: 'positions',
        where: {
          period: { equals: periodId },
        },
        sort: 'order',
        depth: 2,
      });

      // Get members for this period
      const members = await payload.find({
        collection: 'members',
        where: {
          period: { equals: periodId },
          isActive: { equals: true },
        },
        depth: 2,
      });

      // Group members by position
      const structure = positions.docs.map(position => ({
        ...position,
        members: members.docs.filter(
          member => {
            const memberPosition = member.position as any;
            return memberPosition?.id === position.id || memberPosition === position.id;
          }
        ),
      }));

      res.json({
        period: positions.docs[0]?.period || null,
        structure,
      });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching organization structure' });
    }
  });

  // Get member detail
  app.get('/api/public/members/:slug', async (req, res) => {
    try {
      const member = await payload.find({
        collection: 'members',
        where: { slug: { equals: req.params.slug } },
        limit: 1,
        depth: 2,
      });

      if (member.docs.length === 0) {
        return res.status(404).json({ error: 'Member not found' });
      }

      res.json(member.docs[0]);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching member' });
    }
  });

  // ============================================
  // 2. NEWS & POSTS (Berita & Kegiatan)
  // ============================================

  // Get all posts (with filters)
  app.get('/api/public/posts', async (req, res) => {
    try {
      const { category, tag, limit = 10, page = 1 } = req.query;

      const where: any = { status: { equals: 'published' } };

      if (category && typeof category === 'string') {
        where.category = { equals: category };
      }

      const posts = await payload.find({
        collection: 'posts',
        where,
        limit: typeof limit === 'string' ? parseInt(limit) : 10,
        page: typeof page === 'string' ? parseInt(page) : 1,
        sort: '-publishedDate',
        depth: 2,
      });

      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching posts' });
    }
  });

  // Get latest posts
  app.get('/api/public/posts/latest', async (req, res) => {
    try {
      const { limit = '5' } = req.query;

      const posts = await payload.find({
        collection: 'posts',
        where: { status: { equals: 'published' } },
        limit: typeof limit === 'string' ? parseInt(limit) : 5,
        sort: '-publishedDate',
        depth: 2,
      });

      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching latest posts' });
    }
  });

  // Get post by slug
  app.get('/api/public/posts/:slug', async (req, res) => {
    try {
      const post = await payload.find({
        collection: 'posts',
        where: {
          slug: { equals: req.params.slug },
          status: { equals: 'published' },
        },
        limit: 1,
        depth: 2,
      });

      if (post.docs.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Increment views
      const currentViews = (post.docs[0].views as number) || 0;
      await payload.update({
        collection: 'posts',
        id: post.docs[0].id,
        data: {
          views: currentViews + 1,
        },
      });

      res.json(post.docs[0]);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching post' });
    }
  });

  // Search posts
  app.get('/api/public/posts/search', async (req, res) => {
    try {
      const { q, limit = '10' } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query required' });
      }

      const posts = await payload.find({
        collection: 'posts',
        where: {
          and: [
            { status: { equals: 'published' } },
            {
              or: [
                { title: { contains: q } },
                { excerpt: { contains: q } },
              ],
            },
          ],
        },
        limit: typeof limit === 'string' ? parseInt(limit) : 10,
        sort: '-publishedDate',
        depth: 2,
      });

      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: 'Error searching posts' });
    }
  });

  // ============================================
  // 3. GALLERY (Galeri)
  // ============================================

  // Get all galleries
  app.get('/api/public/galleries', async (req, res) => {
    try {
      const { type, limit = '12', page = '1' } = req.query;

      const where: any = {};
      if (type && typeof type === 'string') {
        where.type = { equals: type };
      }

      const galleries = await payload.find({
        collection: 'galleries',
        where,
        limit: typeof limit === 'string' ? parseInt(limit) : 12,
        page: typeof page === 'string' ? parseInt(page) : 1,
        sort: '-eventDate',
        depth: 2,
      });

      res.json(galleries);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching galleries' });
    }
  });

  // Get gallery by slug
  app.get('/api/public/galleries/:slug', async (req, res) => {
    try {
      const gallery = await payload.find({
        collection: 'galleries',
        where: { slug: { equals: req.params.slug } },
        limit: 1,
        depth: 2,
      });

      if (gallery.docs.length === 0) {
        return res.status(404).json({ error: 'Gallery not found' });
      }

      res.json(gallery.docs[0]);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching gallery' });
    }
  });

  // ============================================
  // 4. DOCUMENTS (Arsip & Dokumen)
  // ============================================

  // Get public documents
  app.get('/api/public/documents', async (req, res) => {
    try {
      const { category, limit = '20', page = '1' } = req.query;

      const where: any = { isPublic: { equals: true } };

      if (category && typeof category === 'string') {
        where.category = { equals: category };
      }

      const documents = await payload.find({
        collection: 'documents',
        where,
        limit: typeof limit === 'string' ? parseInt(limit) : 20,
        page: typeof page === 'string' ? parseInt(page) : 1,
        sort: '-uploadDate',
        depth: 2,
      });

      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching documents' });
    }
  });

  // ============================================
  // 5. PAGES (Halaman Statis)
  // ============================================

  // Get page by slug
  app.get('/api/public/pages/:slug', async (req, res) => {
    try {
      const page = await payload.find({
        collection: 'pages',
        where: {
          slug: { equals: req.params.slug },
          status: { equals: 'published' },
        },
        limit: 1,
        depth: 2,
      });

      if (page.docs.length === 0) {
        return res.status(404).json({ error: 'Page not found' });
      }

      res.json(page.docs[0]);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching page' });
    }
  });

  // ============================================
  // 6. GLOBALS (Settings, About, Navigation)
  // ============================================

  // Get website settings
  app.get('/api/public/settings', async (req, res) => {
    try {
      const settings = await payload.findGlobal({
        slug: 'settings',
        depth: 2,
      });
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching settings' });
    }
  });

  // Get about info
  app.get('/api/public/about', async (req, res) => {
    try {
      const about = await payload.findGlobal({
        slug: 'about',
        depth: 2,
      });
      res.json(about);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching about info' });
    }
  });

  // Get navigation
  app.get('/api/public/navigation', async (req, res) => {
    try {
      const navigation = await payload.findGlobal({
        slug: 'navigation',
      });
      res.json(navigation);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching navigation' });
    }
  });

  // ============================================
  // 7. STATISTICS & DASHBOARD DATA
  // ============================================

  // Get dashboard statistics
  app.get('/api/public/stats', async (req, res) => {
    try {
      const [members, posts, galleries, documents] = await Promise.all([
        payload.find({
          collection: 'members',
          where: { isActive: { equals: true } },
          limit: 0,
        }),
        payload.find({
          collection: 'posts',
          where: { status: { equals: 'published' } },
          limit: 0,
        }),
        payload.find({
          collection: 'galleries',
          limit: 0,
        }),
        payload.find({
          collection: 'documents',
          where: { isPublic: { equals: true } },
          limit: 0,
        }),
      ]);

      res.json({
        totalMembers: members.totalDocs,
        totalPosts: posts.totalDocs,
        totalGalleries: galleries.totalDocs,
        totalDocuments: documents.totalDocs,
      });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching statistics' });
    }
  });

  // ============================================
  // 8. CONTACT FORM (Optional)
  // ============================================

  app.post('/api/public/contact', async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;

      if (!name || !email || !message) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      // Here you can save to database or send email
      // For now, just return success
      payload.logger.info(`Contact form submitted: ${name} - ${email}`);

      res.json({
        success: true,
        message: 'Pesan Anda telah terkirim. Terima kasih!',
      });
    } catch (error) {
      res.status(500).json({ error: 'Error sending message' });
    }
  });

  // ============================================
  // API DOCUMENTATION
  // ============================================

  app.get('/api-docs', (req, res) => {
    res.json({
      title: 'CMS Organisasi - Public API Documentation',
      version: '1.0.0',
      endpoints: {
        organization: {
          'GET /api/public/period/active': 'Get active period',
          'GET /api/public/periods': 'Get all periods',
          'GET /api/public/structure/:periodId?': 'Get organization structure',
          'GET /api/public/members/:slug': 'Get member detail',
        },
        posts: {
          'GET /api/public/posts': 'Get all posts (with filters)',
          'GET /api/public/posts/latest': 'Get latest posts',
          'GET /api/public/posts/:slug': 'Get post by slug',
          'GET /api/public/posts/search?q=keyword': 'Search posts',
        },
        galleries: {
          'GET /api/public/galleries': 'Get all galleries',
          'GET /api/public/galleries/:slug': 'Get gallery by slug',
        },
        documents: {
          'GET /api/public/documents': 'Get public documents',
        },
        pages: {
          'GET /api/public/pages/:slug': 'Get page by slug',
        },
        globals: {
          'GET /api/public/settings': 'Get website settings',
          'GET /api/public/about': 'Get about info',
          'GET /api/public/navigation': 'Get navigation menu',
        },
        stats: {
          'GET /api/public/stats': 'Get dashboard statistics',
        },
        contact: {
          'POST /api/public/contact': 'Submit contact form',
        },
      },
      admin: {
        panel: '/admin',
        restAPI: '/api',
        graphQL: '/api/graphql',
      },
    });
  });

  // ============================================
  // SERVE STATIC FRONTEND FILES
  // ============================================
  
  // Serve static files from public folder
  app.use(express.static(path.join(__dirname, '../public')));

  // Root route - Serve frontend HTML
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  // Start server
  app.listen(PORT, () => {
    console.log('\n🚀 ========================================');
    console.log('   CMS ORGANISASI - Server Started');
    console.log('========================================');
    console.log(`📍 Server:        http://localhost:${PORT}`);
    console.log(`🌐 Frontend:      http://localhost:${PORT}/`);
    console.log(`🎨 Admin Panel:   http://localhost:${PORT}/admin`);
    console.log(`📚 API Docs:      http://localhost:${PORT}/api-docs`);
    console.log(`🔌 REST API:      http://localhost:${PORT}/api`);
    console.log(`📊 GraphQL:       http://localhost:${PORT}/api/graphql`);
    console.log('========================================\n');
  });
};

start();