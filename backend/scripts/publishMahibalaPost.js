const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { supabase } = require('../db/supabase');

const SOURCE_IMG_PATH = 'C:/Users/nijju/.gemini/antigravity-ide/brain/539287fe-6dba-4443-b098-737ef14d5c91/.user_uploaded/media_1792556228289.jpg';

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log('--- 1. Preparing image assets ---');
  if (!fs.existsSync(SOURCE_IMG_PATH)) {
    throw new Error('Source uploaded image not found at ' + SOURCE_IMG_PATH);
  }

  const imgBuffer = fs.readFileSync(SOURCE_IMG_PATH);
  console.log('Image size:', imgBuffer.length, 'bytes');

  // Copy to frontend public directories
  const targetDir1 = path.join(__dirname, '../../frontend/public/showcase');
  const targetDir2 = path.join(__dirname, '../../frontend/public/uploads');
  if (!fs.existsSync(targetDir1)) fs.mkdirSync(targetDir1, { recursive: true });
  if (!fs.existsSync(targetDir2)) fs.mkdirSync(targetDir2, { recursive: true });

  fs.writeFileSync(path.join(targetDir1, 'mahibala-pdf-fusion.jpg'), imgBuffer);
  fs.writeFileSync(path.join(targetDir2, 'mahibala-pdf-fusion.jpg'), imgBuffer);
  console.log('Copied image to frontend public folders.');

  // Upload to Supabase Storage bucket 'department-posts'
  const storageFilename = `showcase-mahibala-pdf-fusion-${Date.now()}.jpg`;
  console.log('Uploading image to Supabase storage bucket department-posts as', storageFilename);
  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('department-posts')
    .upload(storageFilename, imgBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  let publicImageUrl = `/showcase/mahibala-pdf-fusion.jpg`;
  let storageRef = `storage://department-posts/${storageFilename}`;

  if (uploadErr) {
    console.warn('Supabase storage upload error:', uploadErr.message);
  } else {
    const { data: pubData } = supabase.storage.from('department-posts').getPublicUrl(storageFilename);
    if (pubData?.publicUrl) {
      publicImageUrl = pubData.publicUrl;
      console.log('Supabase Storage Public CDN URL:', publicImageUrl);
    }
  }

  await pgClient.connect();

  // Find admin user for author_id
  const adminRes = await pgClient.query("SELECT id, email FROM public.users WHERE role = 'admin' LIMIT 1;");
  const adminId = adminRes.rows[0]?.id;
  if (!adminId) throw new Error('Admin user not found in database.');

  console.log('\n--- 2. Publishing to Showcase Posts ---');
  const showcaseTitle = 'Student Achievement: PDF Fusion Android App by Mahibala H (III CSE B)';
  const showcaseDescription = `We are delighted to celebrate Mahibala H, 2028 Batch student of III CSE B, Department of Computer Science and Engineering, who has developed and launched "PDF Fusion", an all-in-one Android application now available on the Google Play Store.\n\nThe application integrates multiple powerful PDF features into a single, user-friendly platform: PDF reading, editing, merging, splitting, compression, document scanning, PDF-to-image and image-to-PDF conversion, annotation, and digital signatures. It also supports offline processing, enabling users to manage documents without requiring continuous internet connectivity.\n\nHe has also developed InfiniteForge, an online platform offering AI tools and developer utilities.\n\nHearty congratulations to Mahibala and the Department of CSE!`;
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.mahibala.pdffusion';

  const newShowcasePost = {
    title: showcaseTitle,
    description: showcaseDescription,
    category: 'Achievement',
    cover_image_url: publicImageUrl,
    image_url: publicImageUrl,
    image_storage_path: storageRef,
    project_url: playStoreUrl,
    link_url: playStoreUrl,
    author_id: adminId,
    author_name: 'Department of Computer Science and Engineering',
    author_designation: 'HOD / Admin',
    is_featured: true,
    published: true,
    is_published: true
  };

  const { data: createdShowcase, error: scErr } = await supabase
    .from('showcase_posts')
    .insert([newShowcasePost])
    .select()
    .single();

  if (scErr) {
    console.error('Failed to insert showcase post via Supabase client:', scErr);
    // Direct SQL insert fallback
    const resSql = await pgClient.query(`
      INSERT INTO public.showcase_posts (
        title, description, category, cover_image_url, image_url, image_storage_path,
        project_url, link_url, author_id, author_name, author_designation,
        is_featured, published, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `, [
      showcaseTitle, showcaseDescription, 'Achievement', publicImageUrl, publicImageUrl, storageRef,
      playStoreUrl, playStoreUrl, adminId, 'Department of Computer Science and Engineering', 'HOD / Admin',
      true, true, true
    ]);
    console.log('Inserted showcase post via direct SQL:', resSql.rows[0].id);
  } else {
    console.log('Created Showcase Post ID:', createdShowcase.id);
  }

  console.log('\n--- 3. Publishing to Department Announcements / News ---');
  const annId = `ann_${Date.now()}_mahibala`;
  const annTitle = '🎉 Student Achievement | Product Development — PDF Fusion on Google Play Store';
  const annMessage = `We are delighted to inform you that Mahibala H, a student of III CSE B, has developed PDF Fusion, an Android application now available on the Google Play Store.\n\nThe application integrates several useful features into a single, user-friendly platform, including PDF reading, editing, merging, splitting, compression, document scanning, PDF-to-image and image-to-PDF conversion, annotation, and digital signatures with offline processing support.\n\nInstead of installing multiple applications for different PDF tasks, PDF Fusion brings essential tools together in a single application.\n\n👏 Congratulations to Mahibala and the Department of CSE!\n\n📲 Download Now: https://play.google.com/store/apps/details?id=com.mahibala.pdffusion`;

  const { data: createdAnn, error: annErr } = await supabase
    .from('announcements')
    .insert([{
      id: annId,
      title: annTitle,
      message: annMessage,
      type: 'Achievement',
      is_important: true,
      link: playStoreUrl,
      target: 'all',
      image_url: publicImageUrl,
      image_storage_path: storageRef,
      created_by: adminId,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (annErr) {
    console.warn('Announcements insert warning (trying direct SQL):', annErr.message);
    const annSql = await pgClient.query(`
      INSERT INTO public.announcements (
        id, title, message, type, is_important, link, target, image_url, image_storage_path, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
      RETURNING *;
    `, [
      annId, annTitle, annMessage, 'Achievement', true, playStoreUrl, 'all', publicImageUrl, storageRef, adminId
    ]);
    console.log('Inserted announcement via direct SQL:', annSql.rows[0].id);
  } else {
    console.log('Created Announcement ID:', createdAnn.id);
  }

  // Update local fallback store as well
  const localStorePath = path.join(__dirname, '../db/showcase_posts_local.json');
  try {
    let localPosts = [];
    if (fs.existsSync(localStorePath)) {
      localPosts = JSON.parse(fs.readFileSync(localStorePath, 'utf8'));
    }
    localPosts.unshift({
      id: `post_mahibala_${Date.now()}`,
      title: showcaseTitle,
      description: showcaseDescription,
      category: 'Achievement',
      cover_image_url: publicImageUrl,
      image_url: publicImageUrl,
      image_storage_path: storageRef,
      project_url: playStoreUrl,
      link_url: playStoreUrl,
      author_id: adminId,
      author_name: 'Department of Computer Science and Engineering',
      author_designation: 'HOD / Admin',
      is_featured: true,
      published: true,
      is_published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    fs.writeFileSync(localStorePath, JSON.stringify(localPosts, null, 2), 'utf8');
    console.log('Updated local fallback store as well.');
  } catch (e) {
    console.warn('Local store update warning:', e.message);
  }

  await pgClient.end();
  console.log('\n--- SUCCESS! All posts published and live! ---');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
