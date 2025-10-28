import { buildConfig } from 'payload/config';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { slateEditor } from '@payloadcms/richtext-slate';
import { webpackBundler } from '@payloadcms/bundler-webpack';
import path from 'path';

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000',
  admin: {
    user: 'users',
    bundler: webpackBundler(),
    meta: {
      titleSuffix: '- CMS Organisasi',
      favicon: '/assets/favicon.ico',
    },
  },
  collections: [
    // 1. USERS & AUTHENTICATION
    {
      slug: 'users',
      auth: {
        tokenExpiration: 7200, // 2 jam
        maxLoginAttempts: 5,
        lockTime: 600000, // 10 menit
      },
      admin: {
        useAsTitle: 'email',
        defaultColumns: ['name', 'email', 'role', 'isActive'],
        group: 'Admin',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Nama Lengkap',
        },
        {
          name: 'role',
          type: 'select',
          options: [
            { label: 'Super Admin', value: 'super_admin' },
            { label: 'Admin', value: 'admin' },
            { label: 'Editor', value: 'editor' },
            { label: 'Viewer', value: 'viewer' },
          ],
          defaultValue: 'viewer',
          required: true,
          label: 'Role',
        },
        {
          name: 'isActive',
          type: 'checkbox',
          defaultValue: true,
          label: 'Akun Aktif',
        },
        {
          name: 'phone',
          type: 'text',
          label: 'No. Telepon',
        },
        {
          name: 'avatar',
          type: 'upload',
          relationTo: 'media',
          label: 'Foto Profil',
        },
      ],
    },

    // 2. ORGANIZATION PERIODS (Multi-periode kepengurusan)
    {
      slug: 'periods',
      admin: {
        useAsTitle: 'name',
        defaultColumns: ['name', 'startDate', 'endDate', 'isActive'],
        group: 'Organisasi',
      },
      access: {
        read: () => true,
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Nama Periode',
          admin: {
            description: 'Contoh: Periode 2023-2024',
          },
        },
        {
          name: 'startDate',
          type: 'date',
          required: true,
          label: 'Tanggal Mulai',
        },
        {
          name: 'endDate',
          type: 'date',
          required: true,
          label: 'Tanggal Selesai',
        },
        {
          name: 'isActive',
          type: 'checkbox',
          defaultValue: false,
          label: 'Periode Aktif',
          admin: {
            description: 'Hanya satu periode yang bisa aktif',
          },
        },
        {
          name: 'theme',
          type: 'text',
          label: 'Tema Periode',
        },
        {
          name: 'vision',
          type: 'textarea',
          label: 'Visi',
        },
        {
          name: 'mission',
          type: 'textarea',
          label: 'Misi',
        },
      ],
    },

    // 3. ORGANIZATION STRUCTURE POSITIONS
    {
      slug: 'positions',
      admin: {
        useAsTitle: 'title',
        defaultColumns: ['title', 'level', 'order', 'period'],
        group: 'Organisasi',
      },
      access: {
        read: () => true,
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Nama Jabatan',
          admin: {
            description: 'Contoh: Ketua Umum, Sekretaris, Bendahara',
          },
        },
        {
          name: 'level',
          type: 'select',
          required: true,
          options: [
            { label: 'Pelindung', value: 'pelindung' },
            { label: 'Penasehat', value: 'penasehat' },
            { label: 'Ketua', value: 'ketua' },
            { label: 'Wakil Ketua', value: 'wakil_ketua' },
            { label: 'Sekretaris', value: 'sekretaris' },
            { label: 'Bendahara', value: 'bendahara' },
            { label: 'Koordinator Bidang', value: 'koordinator' },
            { label: 'Anggota Bidang', value: 'anggota' },
          ],
          label: 'Level Jabatan',
        },
        {
          name: 'department',
          type: 'text',
          label: 'Bidang/Departemen',
          admin: {
            description: 'Contoh: Bidang Pendidikan, Bidang Humas',
          },
        },
        {
          name: 'order',
          type: 'number',
          required: true,
          defaultValue: 0,
          label: 'Urutan Tampilan',
        },
        {
          name: 'period',
          type: 'relationship',
          relationTo: 'periods',
          required: true,
          label: 'Periode',
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Deskripsi Tugas',
        },
      ],
    },

    // 4. MEMBERS (Anggota Organisasi)
    {
      slug: 'members',
      admin: {
        useAsTitle: 'name',
        defaultColumns: ['name', 'position', 'period', 'isActive'],
        group: 'Organisasi',
      },
      access: {
        read: () => true,
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Nama Lengkap',
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
          label: 'Slug',
          admin: {
            description: 'URL-friendly name',
          },
        },
        {
          name: 'photo',
          type: 'upload',
          relationTo: 'media',
          required: true,
          label: 'Foto',
        },
        {
          name: 'position',
          type: 'relationship',
          relationTo: 'positions',
          required: true,
          label: 'Jabatan',
        },
        {
          name: 'period',
          type: 'relationship',
          relationTo: 'periods',
          required: true,
          label: 'Periode',
        },
        {
          name: 'email',
          type: 'email',
          label: 'Email',
        },
        {
          name: 'phone',
          type: 'text',
          label: 'No. Telepon',
        },
        {
          name: 'bio',
          type: 'richText',
          label: 'Biografi',
        },
        {
          name: 'socialMedia',
          type: 'group',
          label: 'Media Sosial',
          fields: [
            { name: 'facebook', type: 'text', label: 'Facebook' },
            { name: 'instagram', type: 'text', label: 'Instagram' },
            { name: 'twitter', type: 'text', label: 'Twitter' },
            { name: 'linkedin', type: 'text', label: 'LinkedIn' },
          ],
        },
        {
          name: 'isActive',
          type: 'checkbox',
          defaultValue: true,
          label: 'Status Aktif',
        },
        {
          name: 'joinDate',
          type: 'date',
          label: 'Tanggal Bergabung',
        },
      ],
    },

    // 5. NEWS & ARTICLES (Berita & Kegiatan)
    {
      slug: 'posts',
      admin: {
        useAsTitle: 'title',
        defaultColumns: ['title', 'category', 'status', 'publishedDate'],
        group: 'Konten',
      },
      access: {
        read: () => true,
      },
      versions: {
        drafts: true,
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Judul',
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
          label: 'Slug',
          admin: {
            position: 'sidebar',
          },
        },
        {
          name: 'category',
          type: 'select',
          required: true,
          options: [
            { label: 'Berita', value: 'news' },
            { label: 'Kegiatan', value: 'activity' },
            { label: 'Pengumuman', value: 'announcement' },
            { label: 'Prestasi', value: 'achievement' },
          ],
          label: 'Kategori',
          admin: {
            position: 'sidebar',
          },
        },
        {
          name: 'author',
          type: 'relationship',
          relationTo: 'users',
          required: true,
          label: 'Penulis',
          admin: {
            position: 'sidebar',
          },
        },
        {
          name: 'publishedDate',
          type: 'date',
          required: true,
          label: 'Tanggal Publikasi',
          admin: {
            position: 'sidebar',
          },
        },
        {
          name: 'featuredImage',
          type: 'upload',
          relationTo: 'media',
          required: true,
          label: 'Gambar Utama',
        },
        {
          name: 'excerpt',
          type: 'textarea',
          required: true,
          maxLength: 200,
          label: 'Ringkasan',
        },
        {
          name: 'content',
          type: 'richText',
          required: true,
          label: 'Konten',
        },
        {
          name: 'gallery',
          type: 'array',
          label: 'Galeri Foto',
          fields: [
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              required: true,
            },
            {
              name: 'caption',
              type: 'text',
            },
          ],
        },
        {
          name: 'tags',
          type: 'array',
          label: 'Tag',
          fields: [
            {
              name: 'tag',
              type: 'text',
            },
          ],
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' },
            { label: 'Archived', value: 'archived' },
          ],
          defaultValue: 'draft',
          required: true,
          label: 'Status',
          admin: {
            position: 'sidebar',
          },
        },
        {
          name: 'views',
          type: 'number',
          defaultValue: 0,
          label: 'Jumlah Views',
          admin: {
            position: 'sidebar',
            readOnly: true,
          },
        },
      ],
    },

    // 6. GALLERY (Galeri & Dokumentasi)
    {
      slug: 'galleries',
      admin: {
        useAsTitle: 'title',
        defaultColumns: ['title', 'type', 'eventDate'],
        group: 'Konten',
      },
      access: {
        read: () => true,
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Judul Galeri',
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
          label: 'Slug',
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          options: [
            { label: 'Foto', value: 'photo' },
            { label: 'Video', value: 'video' },
          ],
          label: 'Tipe',
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Deskripsi',
        },
        {
          name: 'eventDate',
          type: 'date',
          label: 'Tanggal Kegiatan',
        },
        {
          name: 'coverImage',
          type: 'upload',
          relationTo: 'media',
          label: 'Cover',
        },
        {
          name: 'items',
          type: 'array',
          label: 'Item Galeri',
          fields: [
            {
              name: 'media',
              type: 'upload',
              relationTo: 'media',
              required: true,
            },
            {
              name: 'caption',
              type: 'text',
            },
            {
              name: 'videoUrl',
              type: 'text',
              admin: {
                condition: (data, siblingData) => siblingData?.type === 'video',
              },
            },
          ],
        },
      ],
    },

    // 7. DOCUMENTS / ARCHIVES (Arsip & Dokumen)
    {
      slug: 'documents',
      admin: {
        useAsTitle: 'title',
        defaultColumns: ['title', 'category', 'uploadDate'],
        group: 'Konten',
      },
      access: {
        read: ({ req: { user } }) => {
          if (user) return true;
          return {
            isPublic: { equals: true },
          };
        },
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Judul Dokumen',
        },
        {
          name: 'category',
          type: 'select',
          required: true,
          options: [
            { label: 'Surat Keputusan', value: 'sk' },
            { label: 'Surat Edaran', value: 'se' },
            { label: 'Laporan', value: 'report' },
            { label: 'Proposal', value: 'proposal' },
            { label: 'Anggaran Dasar/RT', value: 'ad_art' },
            { label: 'Lainnya', value: 'other' },
          ],
          label: 'Kategori',
        },
        {
          name: 'file',
          type: 'upload',
          relationTo: 'media',
          required: true,
          label: 'File',
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Deskripsi',
        },
        {
          name: 'uploadDate',
          type: 'date',
          required: true,
          defaultValue: () => new Date().toISOString(),
          label: 'Tanggal Upload',
        },
        {
          name: 'documentDate',
          type: 'date',
          label: 'Tanggal Dokumen',
        },
        {
          name: 'isPublic',
          type: 'checkbox',
          defaultValue: false,
          label: 'Dokumen Publik',
          admin: {
            description: 'Jika dicentang, dokumen bisa diakses tanpa login',
          },
        },
        {
          name: 'tags',
          type: 'array',
          label: 'Tag',
          fields: [
            {
              name: 'tag',
              type: 'text',
            },
          ],
        },
      ],
    },

    // 8. PAGES (Halaman Statis)
    {
      slug: 'pages',
      admin: {
        useAsTitle: 'title',
        defaultColumns: ['title', 'slug', 'status'],
        group: 'Konten',
      },
      access: {
        read: () => true,
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Judul Halaman',
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
          label: 'Slug',
          admin: {
            position: 'sidebar',
          },
        },
        {
          name: 'content',
          type: 'richText',
          required: true,
          label: 'Konten',
        },
        {
          name: 'featuredImage',
          type: 'upload',
          relationTo: 'media',
          label: 'Gambar Utama',
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' },
          ],
          defaultValue: 'draft',
          required: true,
          label: 'Status',
          admin: {
            position: 'sidebar',
          },
        },
      ],
    },

    // 9. MEDIA (Upload Management)
    {
      slug: 'media',
      upload: {
        staticDir: path.resolve(__dirname, 'media'),
        imageSizes: [
          {
            name: 'thumbnail',
            width: 400,
            height: 300,
            position: 'centre',
          },
          {
            name: 'card',
            width: 768,
            height: 576,
            position: 'centre',
          },
          {
            name: 'feature',
            width: 1200,
            height: 630,
            position: 'centre',
          },
        ],
        adminThumbnail: 'thumbnail',
        mimeTypes: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      },
      admin: {
        group: 'Media',
      },
      access: {
        read: () => true,
      },
      fields: [
        {
          name: 'alt',
          type: 'text',
          label: 'Alt Text',
        },
        {
          name: 'caption',
          type: 'text',
          label: 'Caption',
        },
      ],
    },

    // 10. ACTIVITY LOGS (Riwayat & Log Aktivitas)
    {
      slug: 'activity-logs',
      admin: {
        useAsTitle: 'action',
        defaultColumns: ['action', 'user', 'collection', 'createdAt'],
        group: 'Admin',
      },
      access: {
        read: ({ req: { user } }) => {
          return user?.role === 'super_admin' || user?.role === 'admin';
        },
        create: () => false,
        update: () => false,
        delete: ({ req: { user } }) => user?.role === 'super_admin',
      },
      fields: [
        {
          name: 'action',
          type: 'select',
          required: true,
          options: [
            { label: 'Create', value: 'create' },
            { label: 'Update', value: 'update' },
            { label: 'Delete', value: 'delete' },
            { label: 'Login', value: 'login' },
            { label: 'Logout', value: 'logout' },
          ],
          label: 'Aksi',
        },
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
          required: true,
          label: 'User',
        },
        {
          name: 'collection',
          type: 'text',
          label: 'Collection',
        },
        {
          name: 'documentId',
          type: 'text',
          label: 'Document ID',
        },
        {
          name: 'details',
          type: 'textarea',
          label: 'Detail',
        },
        {
          name: 'ipAddress',
          type: 'text',
          label: 'IP Address',
        },
      ],
    },

    // 11. RECYCLE BIN (Soft Delete)
    {
      slug: 'recycle-bin',
      admin: {
        useAsTitle: 'originalTitle',
        defaultColumns: ['originalTitle', 'collection', 'deletedBy', 'deletedAt'],
        group: 'Admin',
      },
      access: {
        read: ({ req: { user } }) => {
          return user?.role === 'super_admin' || user?.role === 'admin';
        },
      },
      fields: [
        {
          name: 'originalTitle',
          type: 'text',
          required: true,
          label: 'Judul Original',
        },
        {
          name: 'collection',
          type: 'text',
          required: true,
          label: 'Collection',
        },
        {
          name: 'documentId',
          type: 'text',
          required: true,
          label: 'Document ID',
        },
        {
          name: 'data',
          type: 'json',
          required: true,
          label: 'Data Backup',
        },
        {
          name: 'deletedBy',
          type: 'relationship',
          relationTo: 'users',
          required: true,
          label: 'Dihapus Oleh',
        },
        {
          name: 'deletedAt',
          type: 'date',
          required: true,
          defaultValue: () => new Date().toISOString(),
          label: 'Tanggal Dihapus',
        },
      ],
    },
  ],

  // GLOBALS (Pengaturan Website)
  globals: [
    {
      slug: 'settings',
      admin: {
        group: 'Pengaturan',
      },
      fields: [
        {
          name: 'siteName',
          type: 'text',
          required: true,
          defaultValue: 'Website Organisasi',
          label: 'Nama Website',
        },
        {
          name: 'tagline',
          type: 'text',
          label: 'Tagline',
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Deskripsi Website',
        },
        {
          name: 'logo',
          type: 'upload',
          relationTo: 'media',
          label: 'Logo',
        },
        {
          name: 'favicon',
          type: 'upload',
          relationTo: 'media',
          label: 'Favicon',
        },
        {
          name: 'contactInfo',
          type: 'group',
          label: 'Informasi Kontak',
          fields: [
            { name: 'email', type: 'email', label: 'Email' },
            { name: 'phone', type: 'text', label: 'Telepon' },
            { name: 'address', type: 'textarea', label: 'Alamat' },
            { name: 'mapUrl', type: 'text', label: 'Google Maps URL' },
          ],
        },
        {
          name: 'socialMedia',
          type: 'group',
          label: 'Media Sosial',
          fields: [
            { name: 'facebook', type: 'text', label: 'Facebook' },
            { name: 'instagram', type: 'text', label: 'Instagram' },
            { name: 'twitter', type: 'text', label: 'Twitter' },
            { name: 'youtube', type: 'text', label: 'YouTube' },
            { name: 'linkedin', type: 'text', label: 'LinkedIn' },
            { name: 'tiktok', type: 'text', label: 'TikTok' },
          ],
        },
        {
          name: 'theme',
          type: 'group',
          label: 'Tema & Warna',
          fields: [
            {
              name: 'primaryColor',
              type: 'text',
              label: 'Warna Utama',
              admin: {
                description: 'Format: #RRGGBB',
              },
            },
            {
              name: 'secondaryColor',
              type: 'text',
              label: 'Warna Sekunder',
            },
            {
              name: 'layout',
              type: 'select',
              options: [
                { label: 'Modern', value: 'modern' },
                { label: 'Klasik', value: 'classic' },
                { label: 'Minimalis', value: 'minimal' },
              ],
              defaultValue: 'modern',
              label: 'Layout',
            },
          ],
        },
        {
          name: 'seo',
          type: 'group',
          label: 'SEO',
          fields: [
            { name: 'metaTitle', type: 'text', label: 'Meta Title' },
            { name: 'metaDescription', type: 'textarea', label: 'Meta Description' },
            { name: 'keywords', type: 'text', label: 'Keywords' },
            { name: 'ogImage', type: 'upload', relationTo: 'media', label: 'OG Image' },
          ],
        },
      ],
    },
    {
      slug: 'about',
      admin: {
        group: 'Pengaturan',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          defaultValue: 'Tentang Kami',
          label: 'Judul',
        },
        {
          name: 'history',
          type: 'richText',
          label: 'Sejarah Organisasi',
        },
        {
          name: 'vision',
          type: 'textarea',
          label: 'Visi',
        },
        {
          name: 'mission',
          type: 'textarea',
          label: 'Misi',
        },
        {
          name: 'values',
          type: 'array',
          label: 'Nilai-Nilai',
          fields: [
            { name: 'value', type: 'text', label: 'Nilai' },
            { name: 'description', type: 'textarea', label: 'Deskripsi' },
          ],
        },
        {
          name: 'achievements',
          type: 'array',
          label: 'Prestasi',
          fields: [
            { name: 'year', type: 'text', label: 'Tahun' },
            { name: 'title', type: 'text', label: 'Judul' },
            { name: 'description', type: 'textarea', label: 'Deskripsi' },
          ],
        },
      ],
    },
    {
      slug: 'navigation',
      admin: {
        group: 'Pengaturan',
      },
      fields: [
        {
          name: 'mainMenu',
          type: 'array',
          label: 'Menu Utama',
          fields: [
            { name: 'label', type: 'text', required: true, label: 'Label' },
            { name: 'url', type: 'text', required: true, label: 'URL' },
            { name: 'order', type: 'number', label: 'Urutan' },
            {
              name: 'submenu',
              type: 'array',
              label: 'Submenu',
              fields: [
                { name: 'label', type: 'text', required: true },
                { name: 'url', type: 'text', required: true },
              ],
            },
          ],
        },
        {
          name: 'footerMenu',
          type: 'array',
          label: 'Menu Footer',
          fields: [
            { name: 'label', type: 'text', required: true },
            { name: 'url', type: 'text', required: true },
          ],
        },
      ],
    },
  ],

  editor: slateEditor({}),
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI,
    },
    migrationDir: path.resolve(__dirname, 'migrations'),
  }),
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: path.resolve(__dirname, 'generated-schema.graphql'),
  },
});