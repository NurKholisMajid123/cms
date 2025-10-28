import express from 'express';
import payload from 'payload';
import { config } from 'dotenv';
import path from 'path';

config();

const app = express();
const PORT = process.env.PORT || 3000;

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ============================================
// HELPER FUNCTIONS
// ============================================

// Activity Logger Helper
async function logActivity(action: string, userId: string, collection?: string, documentId?: string, details?: string, ipAddress?: string) {
  try {
    await payload.create({
      collection: 'activity-logs',
      data: {
        action,
        user: userId,
        collection,
        documentId,
        details,
        ipAddress,
      },
    });
  } catch (error) {
    payload.logger.error('Failed to log activity:', error);
  }
}

// Load common data for all pages
async function loadCommonData() {
  return await Promise.all([
    payload.findGlobal({ slug: 'settings', depth: 2 }),
    payload.findGlobal({ slug: 'navigation', depth: 2 }),
  ]);
}

const start = async () => {
  await payload.init({
    secret: process.env.PAYLOAD_SECRET || 'your-secret-key-here',
    express: app,
    onInit: async () => {
      payload.logger.info(`Payload CMS initialized`);
      payload.logger.info(`Admin URL: ${payload.getAdminURL()}`);
    },
  });

  // ============================================
  // FRONTEND ROUTES
  // ============================================

  // Homepage
  app.get('/', async (req, res) => {
    try {
      const [settings, navigation, about, latestPosts, activePeriod, stats] = await Promise.all([
        payload.findGlobal({ slug: 'settings', depth: 2 }),
        payload.findGlobal({ slug: 'navigation', depth: 2 }),
        payload.findGlobal({ slug: 'about', depth: 2 }),
        payload.find({
          collection: 'posts',
          where: { status: { equals: 'published' } },
          limit: 6,
          sort: '-publishedDate',
          depth: 2,
        }),
        payload.find({
          collection: 'periods',
          where: { isActive: { equals: true } },
          limit: 1,
        }),
        Promise.all([
          payload.find({ collection: 'members', where: { isActive: { equals: true } }, limit: 0 }),
          payload.find({ collection: 'posts', where: { status: { equals: 'published' } }, limit: 0 }),
          payload.find({ collection: 'galleries', limit: 0 }),
        ]),
      ]);

      res.render('pages/home', {
        title: 'Beranda',
        settings,
        navigation,
        about,
        latestPosts: latestPosts.docs,
        activePeriod: activePeriod.docs[0] || null,
        stats: {
          members: stats[0].totalDocs,
          posts: stats[1].totalDocs,
          galleries: stats[2].totalDocs,
        },
      });
    } catch (error) {
      res.status(500).render('pages/error', {
        title: 'Error',
        error: 'Terjadi kesalahan saat memuat halaman',
        settings: {},
        navigation: {},
      });
    }
  });

  // Tentang Kami
  app.get('/tentang', async (req, res) => {
    try {
      const [settings, navigation, about] = await Promise.all([
        payload.findGlobal({ slug: 'settings', depth: 2 }),
        payload.findGlobal({ slug: 'navigation', depth: 2 }),
        payload.findGlobal({ slug: 'about', depth: 2 }),
      ]);

      res.render('pages/about', {
        title: 'Tentang Kami',
        settings,
        navigation,
        about,
      });
    } catch (error) {
      res.status(500).render('pages/error', {
        title: 'Error',
        error: 'Terjadi kesalahan',
        settings: {},
        navigation: {},
      });
    }
  });

  // Struktur Organisasi
  app.get('/struktur', async (req, res) => {
    try {
      const periodId = req.query.period ? String(req.query.period) : undefined;
      const [settings, navigation, periods] = await Promise.all([
        payload.findGlobal({ slug: 'settings', depth: 2 }),
        payload.findGlobal({ slug: 'navigation', depth: 2 }),
        payload.find({ collection: 'periods', sort: '-startDate' }),
      ]);

      let selectedPeriodId: string | undefined = periodId;

      if (!selectedPeriodId) {
        const activePeriod = await payload.find({
          collection: 'periods',
          where: { isActive: { equals: true } },
          limit: 1,
        });
        selectedPeriodId = activePeriod.docs[0]?.id ? String(activePeriod.docs[0].id) : undefined;
      }

      const [positions, members] = await Promise.all([
        payload.find({
          collection: 'positions',
          where: { period: { equals: selectedPeriodId } },
          sort: 'order',
          depth: 2,
        }),
        payload.find({
          collection: 'members',
          where: {
            period: { equals: selectedPeriodId },
            isActive: { equals: true },
          },
          depth: 2,
        }),
      ]);

      const structure = positions.docs.map(position => ({
        ...position,
        members: members.docs.filter(
          member => (member.position as any)?.id === position.id
        ),
      }));

      res.render('pages/structure', {
        title: 'Struktur Organisasi',
        settings,
        navigation,
        periods: periods.docs,
        selectedPeriod: positions.docs[0]?.period || null,
        structure,
      });
    } catch (error) {
      res.status(500).render('pages/error', {
        title: 'Error',
        error: 'Terjadi kesalahan',
        settings: {},
        navigation: {},
      });
    }
  });

  // Berita & Kegiatan
  app.get('/berita', async (req, res) => {
    try {
      const category = req.query.category as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = 12;

      const [settings, navigation, posts] = await Promise.all([
        payload.findGlobal({ slug: 'settings', depth: 2 }),
        payload.findGlobal({ slug: 'navigation', depth: 2 }),
        payload.find({
          collection: 'posts',
          where: {
            status: { equals: 'published' },
            ...(category && { category: { equals: category } }),
          },
          limit,
          page,
          sort: '-publishedDate',
          depth: 2,
        }),
      ]);

      res.render('pages/posts', {
        title: category ? `Berita - ${category}` : 'Berita & Kegiatan',
        settings,
        navigation,
        posts: posts.docs,
        pagination: {
          page: posts.page,
          totalPages: posts.totalPages,
          hasNextPage: posts.hasNextPage,
          hasPrevPage: posts.hasPrevPage,
        },
        selectedCategory: category || null,
      });
    } catch (error) {
      res.status(500).render('pages/error', {
        title: 'Error',
        error: 'Terjadi kesalahan',
        settings: {},
        navigation: {},
      });
    }
  });

  // Detail Berita
  app.get('/berita/:slug', async (req, res) => {
    try {
      const [settings, navigation, post] = await Promise.all([
        payload.findGlobal({ slug: 'settings', depth: 2 }),
        payload.findGlobal({ slug: 'navigation', depth: 2 }),
        payload.find({
          collection: 'posts',
          where: {
            slug: { equals: req.params.slug },
            status: { equals: 'published' },
          },
          limit: 1,
          depth: 2,
        }),
      ]);

      if (post.docs.length === 0) {
        return res.status(404).render('pages/error', {
          title: '404',
          error: 'Berita tidak ditemukan',
          settings,
          navigation,
        });
      }

      // Increment views
      await payload.update({
        collection: 'posts',
        id: post.docs[0].id,
        data: { views: ((post.docs[0].views as number) || 0) + 1 },
      });

      // Get related posts
      const relatedPosts = await payload.find({
        collection: 'posts',
        where: {
          status: { equals: 'published' },
          category: { equals: post.docs[0].category },
          id: { not_equals: post.docs[0].id },
        },
        limit: 3,
        sort: '-publishedDate',
        depth: 2,
      });

      res.render('pages/post-detail', {
        title: post.docs[0].title,
        settings,
        navigation,
        post: post.docs[0],
        relatedPosts: relatedPosts.docs,
      });
    } catch (error) {
      res.status(500).render('pages/error', {
        title: 'Error',
        error: 'Terjadi kesalahan',
        settings: {},
        navigation: {},
      });
    }
  });

  // Galeri
  app.get('/galeri', async (req, res) => {
    try {
      const type = req.query.type as string;
      const page = parseInt(req.query.page as string) || 1;

      const [settings, navigation, galleries] = await Promise.all([
        payload.findGlobal({ slug: 'settings', depth: 2 }),
        payload.findGlobal({ slug: 'navigation', depth: 2 }),
        payload.find({
          collection: 'galleries',
          where: type ? { type: { equals: type } } : {},
          limit: 12,
          page,
          sort: '-eventDate',
          depth: 2,
        }),
      ]);

      res.render('pages/gallery', {
        title: 'Galeri',
        settings,
        navigation,
        galleries: galleries.docs,
        pagination: {
          page: galleries.page,
          totalPages: galleries.totalPages,
          hasNextPage: galleries.hasNextPage,
          hasPrevPage: galleries.hasPrevPage,
        },
        selectedType: type || null,
      });
    } catch (error) {
      res.status(500).render('pages/error', {
        title: 'Error',
        error: 'Terjadi kesalahan',
        settings: {},
        navigation: {},
      });
    }
  });

  // Detail Galeri
  app.get('/galeri/:slug', async (req, res) => {
    try {
      const [settings, navigation, gallery] = await Promise.all([
        payload.findGlobal({ slug: 'settings', depth: 2 }),
        payload.findGlobal({ slug: 'navigation', depth: 2 }),
        payload.find({
          collection: 'galleries',
          where: { slug: { equals: req.params.slug } },
          limit: 1,
          depth: 2,
        }),
      ]);

      if (gallery.docs.length === 0) {
        return res.status(404).render('pages/error', {
          title: '404',
          error: 'Galeri tidak ditemukan',
          settings,
          navigation,
        });
      }

      res.render('pages/gallery-detail', {
        title: gallery.docs[0].title,
        settings,
        navigation,
        gallery: gallery.docs[0],
      });
    } catch (error) {
      res.status(500).render('pages/error', {
        title: 'Error',
        error: 'Terjadi kesalahan',
        settings: {},
        navigation: {},
      });
    }
  });

  // Dokumen
  app.get('/dokumen', async (req, res) => {
    try {
      const category = req.query.category as string;
      const [settings, navigation, documents] = await Promise.all([
        payload.findGlobal({ slug: 'settings', depth: 2 }),
        payload.findGlobal({ slug: 'navigation', depth: 2 }),
        payload.find({
          collection: 'documents',
          where: {
            isPublic: { equals: true },
            ...(category && { category: { equals: category } }),
          },
          limit: 20,
          sort: '-uploadDate',
          depth: 2,
        }),
      ]);

      res.render('pages/documents', {
        title: 'Dokumen',
        settings,
        navigation,
        documents: documents.docs,
        selectedCategory: category || null,
      });
    } catch (error) {
      res.status(500).render('pages/error', {
        title: 'Error',
        error: 'Terjadi kesalahan',
        settings: {},
        navigation: {},
      });
    }
  });

  // Halaman Statis (Pages) - FITUR BARU
  app.get('/halaman/:slug', async (req, res) => {
    try {
      const [settings, navigation, page] = await Promise.all([
        payload.findGlobal({ slug: 'settings', depth: 2 }),
        payload.findGlobal({ slug: 'navigation', depth: 2 }),
        payload.find({
          collection: 'pages',
          where: {
            slug: { equals: req.params.slug },
            status: { equals: 'published' },
          },
          limit: 1,
          depth: 2,
        }),
      ]);

      if (page.docs.length === 0) {
        return res.status(404).render('pages/error', {
          title: '404',
          error: 'Halaman tidak ditemukan',
          settings,
          navigation,
        });
      }

      res.render('pages/page-detail', {
        title: page.docs[0].title,
        settings,
        navigation,
        page: page.docs[0],
      });
    } catch (error) {
      res.status(500).render('pages/error', {
        title: 'Error',
        error: 'Terjadi kesalahan',
        settings: {},
        navigation: {},
      });
    }
  });

  // Kontak
  app.get('/kontak', async (req, res) => {
    try {
      const [settings, navigation] = await Promise.all([
        payload.findGlobal({ slug: 'settings', depth: 2 }),
        payload.findGlobal({ slug: 'navigation', depth: 2 }),
      ]);

      res.render('pages/contact', {
        title: 'Kontak',
        settings,
        navigation,
        success: req.query.success === 'true',
      });
    } catch (error) {
      res.status(500).render('pages/error', {
        title: 'Error',
        error: 'Terjadi kesalahan',
        settings: {},
        navigation: {},
      });
    }
  });

  // Submit Kontak
  app.post('/kontak', async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;

      if (!name || !email || !message) {
        return res.redirect('/kontak?error=true');
      }

      // Log contact form submission
      payload.logger.info(`Contact form: ${name} - ${email} - ${subject}`);

      res.redirect('/kontak?success=true');
    } catch (error) {
      res.redirect('/kontak?error=true');
    }
  });

  // Search
  app.get('/cari', async (req, res) => {
    try {
      const q = req.query.q as string;
      const [settings, navigation, results] = await Promise.all([
        payload.findGlobal({ slug: 'settings', depth: 2 }),
        payload.findGlobal({ slug: 'navigation', depth: 2 }),
        q
          ? payload.find({
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
              limit: 20,
              sort: '-publishedDate',
              depth: 2,
            })
          : null,
      ]);

      res.render('pages/search', {
        title: 'Pencarian',
        settings,
        navigation,
        query: q || '',
        results: results?.docs || [],
      });
    } catch (error) {
      res.status(500).render('pages/error', {
        title: 'Error',
        error: 'Terjadi kesalahan',
        settings: {},
        navigation: {},
      });
    }
  });

  // ============================================
  // PUBLIC API ROUTES
  // ============================================

  // API: Get all published posts
  app.get('/api/posts', async (req, res) => {
    try {
      const { category, page = 1, limit = 10 } = req.query;

      const posts = await payload.find({
        collection: 'posts',
        where: {
          status: { equals: 'published' },
          ...(category && { category: { equals: category as string } }),
        },
        limit: Number(limit),
        page: Number(page),
        sort: '-publishedDate',
        depth: 2,
      });

      res.json({
        success: true,
        data: posts.docs,
        pagination: {
          page: posts.page,
          totalPages: posts.totalPages,
          totalDocs: posts.totalDocs,
          hasNextPage: posts.hasNextPage,
          hasPrevPage: posts.hasPrevPage,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch posts' });
    }
  });

  // API: Get single post by slug
  app.get('/api/posts/:slug', async (req, res) => {
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
        return res.status(404).json({ success: false, error: 'Post not found' });
      }

      res.json({ success: true, data: post.docs[0] });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch post' });
    }
  });

  // API: Get members by period
  app.get('/api/members', async (req, res) => {
    try {
      const { period, active = true } = req.query;

      const members = await payload.find({
        collection: 'members',
        where: {
          ...(period && { period: { equals: period as string } }),
          isActive: { equals: active === 'true' },
        },
        depth: 2,
      });

      res.json({ success: true, data: members.docs });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch members' });
    }
  });

  // API: Get organization structure
  app.get('/api/structure', async (req, res) => {
    try {
      const { period } = req.query;

      let periodId = period as string;
      if (!periodId) {
        const activePeriod = await payload.find({
          collection: 'periods',
          where: { isActive: { equals: true } },
          limit: 1,
        });
        periodId = activePeriod.docs[0]?.id;
      }

      const [positions, members] = await Promise.all([
        payload.find({
          collection: 'positions',
          where: { period: { equals: periodId } },
          sort: 'order',
          depth: 2,
        }),
        payload.find({
          collection: 'members',
          where: {
            period: { equals: periodId },
            isActive: { equals: true },
          },
          depth: 2,
        }),
      ]);

      const structure = positions.docs.map(position => ({
        ...position,
        members: members.docs.filter(
          member => (member.position as any)?.id === position.id
        ),
      }));

      res.json({ success: true, data: structure });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch structure' });
    }
  });

  // API: Get galleries
  app.get('/api/galleries', async (req, res) => {
    try {
      const { type, page = 1, limit = 12 } = req.query;

      const galleries = await payload.find({
        collection: 'galleries',
        where: type ? { type: { equals: type as string } } : {},
        limit: Number(limit),
        page: Number(page),
        sort: '-eventDate',
        depth: 2,
      });

      res.json({
        success: true,
        data: galleries.docs,
        pagination: {
          page: galleries.page,
          totalPages: galleries.totalPages,
          totalDocs: galleries.totalDocs,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch galleries' });
    }
  });

  // API: Get public documents
  app.get('/api/documents', async (req, res) => {
    try {
      const { category } = req.query;

      const documents = await payload.find({
        collection: 'documents',
        where: {
          isPublic: { equals: true },
          ...(category && { category: { equals: category as string } }),
        },
        sort: '-uploadDate',
        depth: 2,
      });

      res.json({ success: true, data: documents.docs });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch documents' });
    }
  });

  // API: Get settings and about
  app.get('/api/settings', async (req, res) => {
    try {
      const [settings, about] = await Promise.all([
        payload.findGlobal({ slug: 'settings', depth: 2 }),
        payload.findGlobal({ slug: 'about', depth: 2 }),
      ]);

      res.json({ success: true, data: { settings, about } });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch settings' });
    }
  });

  // API: Submit contact form
  app.post('/api/contact', async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;

      if (!name || !email || !message) {
        return res.status(400).json({ 
          success: false, 
          error: 'Name, email, and message are required' 
        });
      }

      // Log the contact submission
      payload.logger.info(`API Contact: ${name} - ${email}`);

      // Here you can add email sending logic or save to database

      res.json({ success: true, message: 'Contact form submitted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to submit contact form' });
    }
  });

  // ============================================
  // 404 Handler
  // ============================================
  app.use(async (req, res) => {
    try {
      const [settings, navigation] = await loadCommonData();
      res.status(404).render('pages/error', {
        title: '404 - Halaman Tidak Ditemukan',
        error: 'Halaman yang Anda cari tidak ditemukan',
        settings,
        navigation,
      });
    } catch (error) {
      res.status(404).send('404 - Page Not Found');
    }
  });

  // Start server
  app.listen(PORT, () => {
    console.log('\n🚀 ========================================');
    console.log('   CMS Organisasi - Server Started');
    console.log('========================================');
    console.log(`📍 Server:        http://localhost:${PORT}`);
    console.log(`🌐 Frontend:      http://localhost:${PORT}/`);
    console.log(`🎨 Admin Panel:   http://localhost:${PORT}/admin`);
    console.log(`🔌 REST API:      http://localhost:${PORT}/api`);
    console.log('========================================');
    console.log('\n📋 Available Routes:');
    console.log('   Frontend:');
    console.log('   - GET  /                  Homepage');
    console.log('   - GET  /tentang           Tentang Kami');
    console.log('   - GET  /struktur          Struktur Organisasi');
    console.log('   - GET  /berita            Berita & Kegiatan');
    console.log('   - GET  /berita/:slug      Detail Berita');
    console.log('   - GET  /galeri            Galeri');
    console.log('   - GET  /galeri/:slug      Detail Galeri');
    console.log('   - GET  /dokumen           Dokumen');
    console.log('   - GET  /halaman/:slug     Halaman Statis');
    console.log('   - GET  /kontak            Kontak');
    console.log('   - GET  /cari              Pencarian');
    console.log('\n   REST API:');
    console.log('   - GET  /api/posts         Get all posts');
    console.log('   - GET  /api/posts/:slug   Get single post');
    console.log('   - GET  /api/members       Get members');
    console.log('   - GET  /api/structure     Get structure');
    console.log('   - GET  /api/galleries     Get galleries');
    console.log('   - GET  /api/documents     Get documents');
    console.log('   - GET  /api/settings      Get settings');
    console.log('   - POST /api/contact       Submit contact');
    console.log('========================================\n');
  });
};

start();