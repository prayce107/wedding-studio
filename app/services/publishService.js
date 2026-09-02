const getToken = () => {
  const session = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
  return session ? JSON.parse(session).token : null;
};

const publishService = {
  async saveDraft(slug, invitation) {
    // Check if it exists
    const all = await this.listAll();
    const existing = all.find(i => i.slug === slug);
    
    const title = invitation.data?.general?.name1 ? 
      `${invitation.data.general.name1} & ${invitation.data.general.name2}` : 
      (invitation.data?.opening?.couple || slug);

    if (existing && existing._dbId) {
      // Update
      const res = await fetch(`/api/invitations/${existing._dbId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          title: title,
          content: invitation.data,
          status: "draft",
          slug: slug
        })
      });
      return await res.json();
    } else {
      // Create new
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          category: 'Pernikahan', // default
          template_id: invitation.templateId || "luxury-gold",
          slug: slug,
          title: title
        })
      });
      
      const created = await res.json();
      
      // Update content immediately
      if (created.id) {
        await fetch(`/api/invitations/${created.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
          body: JSON.stringify({ content: invitation.data })
        });
      }
      
      return { success: true };
    }
  },
  
  async publish(slug, invitation) {
    const all = await this.listAll();
    const existing = all.find(i => i.slug === slug);
    if (!existing || !existing._dbId) throw new Error("Draft not found");
    
    const title = invitation.data?.general?.name1 ? 
      `${invitation.data.general.name1} & ${invitation.data.general.name2}` : 
      (invitation.data?.opening?.couple || slug);

    await fetch(`/api/invitations/${existing._dbId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          title: title,
          content: invitation.data,
          status: "published"
        })
    });
    return { success: true };
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
    
    const res = await fetch('/api/invitations', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) return [];
    const list = await res.json();
    
    return list.map(item => {
      // Reconstruct the data object for the dashboard display
      let dataObj = {};
      if (item.content && item.content.general) {
        dataObj = item.content;
      } else {
        // Fallback if content is missing or in different format
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
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = publishService;
} else {
  window.publishService = publishService;
}
