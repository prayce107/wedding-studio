const getToken = () => {
  const session = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
  if (!session) return null;
  try {
    const parsed = JSON.parse(session);
    return parsed.token || null;
  } catch (e) {
    return null;
  }
};

const publishService = {
  async saveDraft(slug, invitation) {
    const token = getToken();
    if (!token) {
      throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
    }

    const all = await this.listAll();
    const existing = all.find(i => i.slug === slug);
    
    const title = invitation.data?.general?.name1 ? 
      `${invitation.data.general.name1} & ${invitation.data.general.name2}` : 
      (invitation.data?.opening?.couple || slug);

    if (existing && existing._dbId) {
      // Update existing invitation
      const res = await fetch(`/api/invitations/${existing._dbId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          title: title,
          content: invitation.data,
          status: existing.status || "draft",
          slug: slug
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Gagal menyimpan draft.');
      }
      return await res.json();
    } else {
      // Create new invitation
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          category: 'Pernikahan',
          template_id: invitation.templateId || "luxury-gold",
          slug: slug,
          title: title
        })
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Gagal membuat undangan baru.');
      }

      const created = await res.json();
      
      // Update content immediately
      if (created.id && invitation.data) {
        await fetch(`/api/invitations/${created.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ content: invitation.data })
        });
      }
      
      return { success: true, id: created.id };
    }
  },
  
  async publish(slug, invitation) {
    const token = getToken();
    if (!token) {
      throw new Error('Sesi login telah berakhir. Silakan login ulang.');
    }

    // Save draft first to ensure it exists in DB
    await this.saveDraft(slug, invitation);

    const all = await this.listAll();
    const existing = all.find(i => i.slug === slug);
    if (!existing || !existing._dbId) {
      throw new Error('Gagal menemukan data undangan untuk diterbitkan.');
    }
    
    const title = invitation.data?.general?.name1 ? 
      `${invitation.data.general.name1} & ${invitation.data.general.name2}` : 
      (invitation.data?.opening?.couple || slug);

    const res = await fetch(`/api/invitations/${existing._dbId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        title: title,
        content: invitation.data,
        status: "active",
        slug: slug
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Gagal mengubah status menjadi aktif.');
    }

    return { success: true, slug: slug };
  },
  
  async getPublished(slug) {
     return this.getDraft(slug);
  },
  
  async getDraft(slug) {
    const all = await this.listAll();
    const item = all.find(i => i.slug === slug);
    if (item && item._dbId) {
       const detailRes = await fetch(`/api/invitations/${item._dbId}`, {
           headers: { 'Authorization': `Bearer ${getToken()}` }
       });
       if (detailRes.ok) {
          const detail = await detailRes.json();
          return {
            _dbId: detail.id,
            id: `invitation-${detail.id}`,
            templateId: detail.template_id,
            status: detail.status,
            data: detail.content || {}
          };
       }
    }
    return null;
  },
  
  async deleteDraft(slug) {
    const all = await this.listAll();
    const item = all.find(i => i.slug === slug);
    if (item && item._dbId) {
      await fetch(`/api/invitations/${item._dbId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
    }
    return { success: true };
  },
  
  async listAll() {
    const token = getToken();
    if (!token) return [];
    
    try {
      const res = await fetch('/api/invitations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) return [];
      const list = await res.json();
      
      return list.map(item => {
        let dataObj = {};
        if (item.content && item.content.general) {
          dataObj = item.content;
        } else {
          dataObj = {
            general: { name1: item.title, name2: "" }
          };
        }
        
        return {
          _dbId: item.id,
          slug: item.slug,
          templateId: item.template_id,
          status: item.status,
          updatedAt: item.active_until || new Date().toISOString(),
          data: dataObj,
          title: item.title
        };
      });
    } catch (e) {
      return [];
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = publishService;
} else {
  window.publishService = publishService;
}
