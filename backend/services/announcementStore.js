const { supabase } = require('../db/supabase');
const cache = require('../services/cache');

// In-memory fallback store when Supabase table 'announcements' hasn't been created yet
let inMemoryStore = [];

async function getAdminAnnouncements() {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error && error.message.includes("Could not find the table")) {
      console.warn('⚠️ Supabase table "announcements" not found. Using fallback in-memory store.');
      return inMemoryStore;
    }
    if (error) {
      console.error('Error fetching admin announcements from Supabase:', error.message);
      return inMemoryStore;
    }
    return data || [];
  } catch (err) {
    return inMemoryStore;
  }
}

async function getActiveAnnouncements() {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, content, image_url, category, is_active, created_at, updated_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error && error.message.includes("Could not find the table")) {
      return inMemoryStore.filter(a => a.is_active);
    }
    if (error) {
      return inMemoryStore.filter(a => a.is_active);
    }
    return data || [];
  } catch (err) {
    return inMemoryStore.filter(a => a.is_active);
  }
}

async function createAnnouncement(post) {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .insert([post])
      .select()
      .single();

    if (error && error.message.includes("Could not find the table")) {
      console.warn('⚠️ Supabase table "announcements" not found. Saving announcement to in-memory store.');
      const fallbackPost = { id: 'mem_' + Date.now(), ...post };
      inMemoryStore.unshift(fallbackPost);
      await cache.del('announcements:active');
      return fallbackPost;
    }
    if (error) {
      console.error('Supabase create announcement error:', error.message);
      const fallbackPost = { id: 'mem_' + Date.now(), ...post };
      inMemoryStore.unshift(fallbackPost);
      await cache.del('announcements:active');
      return fallbackPost;
    }
    await cache.del('announcements:active');
    return data;
  } catch (err) {
    const fallbackPost = { id: 'mem_' + Date.now(), ...post };
    inMemoryStore.unshift(fallbackPost);
    await cache.del('announcements:active');
    return fallbackPost;
  }
}

async function updateAnnouncement(id, updates) {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error && error.message.includes("Could not find the table")) {
      const idx = inMemoryStore.findIndex(a => a.id === id);
      if (idx !== -1) {
        inMemoryStore[idx] = { ...inMemoryStore[idx], ...updates };
        await cache.del('announcements:active');
        return inMemoryStore[idx];
      }
    }
    if (error) {
      const idx = inMemoryStore.findIndex(a => a.id === id);
      if (idx !== -1) {
        inMemoryStore[idx] = { ...inMemoryStore[idx], ...updates };
        await cache.del('announcements:active');
        return inMemoryStore[idx];
      }
    }
    await cache.del('announcements:active');
    return data;
  } catch (err) {
    const idx = inMemoryStore.findIndex(a => a.id === id);
    if (idx !== -1) {
      inMemoryStore[idx] = { ...inMemoryStore[idx], ...updates };
      await cache.del('announcements:active');
      return inMemoryStore[idx];
    }
    throw err;
  }
}

async function deleteAnnouncement(id) {
  try {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error && error.message.includes("Could not find the table")) {
      inMemoryStore = inMemoryStore.filter(a => a.id !== id);
      await cache.del('announcements:active');
      return true;
    }
    if (error) {
      inMemoryStore = inMemoryStore.filter(a => a.id !== id);
      await cache.del('announcements:active');
      return true;
    }
    await cache.del('announcements:active');
    return true;
  } catch (err) {
    inMemoryStore = inMemoryStore.filter(a => a.id !== id);
    await cache.del('announcements:active');
    return true;
  }
}

module.exports = {
  getAdminAnnouncements,
  getActiveAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
};
