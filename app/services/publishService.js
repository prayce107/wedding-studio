(function () {
  'use strict';

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
        // Allow offline/local draft saving without forcing login block
        try {
          if (invitation && invitation.data) {
            localStorage.setItem('invitation_cache_' + slug, JSON.stringify(invitation.data));
            localStorage.setItem('invitation_meta_' + slug, JSON.stringify({
              slug,
              templateId: invitation.templateId || "luxury-gold",
              title: invitation.data?.general?.name1 ? `${invitation.data.general.name1} & ${invitation.data.general.name2}` : slug,
              updatedAt: new Date().toISOString()
            }));
          }
          return { success: true, offline: true };
        } catch (e) {
          return { success: false };
        }
      }

      // Cache locally for instant 0ms offline availability
      try {
        if (invitation.data) {
          localStorage.setItem('invitation_cache_' + slug, JSON.stringify(invitation.data));
        }
      } catch (e) {}

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
            status: "active", // Always lifetime active
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
            body: JSON.stringify({ content: invitation.data, status: "active" })
          });
        }
        
        return { success: true, id: created.id };
      }
    },
    
    async publish(slug, invitation) {
      const token = getToken();

      // Cache locally
      try {
        if (invitation.data) {
          localStorage.setItem('invitation_cache_' + slug, JSON.stringify(invitation.data));
        }
      } catch (e) {}

      // Save and activate in DB
      try {
        await this.saveDraft(slug, invitation);
      } catch (e) {}

      if (token) {
        const all = await this.listAll();
        const existing = all.find(i => i.slug === slug);
        if (existing && existing._dbId) {
          const title = invitation.data?.general?.name1 ? 
            `${invitation.data.general.name1} & ${invitation.data.general.name2}` : 
            (invitation.data?.opening?.couple || slug);

          await fetch(`/api/invitations/${existing._dbId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              title: title,
              content: invitation.data,
              status: "active",
              slug: slug
            })
          });
        }
      }

      return { 
        success: true, 
        slug: slug, 
        link: `${window.location.origin}/i/${slug}`,
        templateLink: `${window.location.origin}/templates/${invitation.templateId || 'luxury-gold'}/index.html?invite=${slug}`
      };
    },
    
    async getPublished(slug) {
       return this.getDraft(slug);
    },
    
    async getDraft(slug) {
      // 1. Try local cache first for instant load
      let cachedContent = null;
      let cachedMeta = null;
      try {
        const c = localStorage.getItem('invitation_cache_' + slug);
        if (c) cachedContent = JSON.parse(c);
        const m = localStorage.getItem('invitation_meta_' + slug);
        if (m) cachedMeta = JSON.parse(m);
      } catch (e) {}

      try {
        const all = await this.listAll();
        const item = all.find(i => i.slug === slug);
        if (item && item._dbId) {
           const detailRes = await fetch(`/api/invitations/${item._dbId}`, {
               headers: { 'Authorization': `Bearer ${getToken()}` }
           });
           if (detailRes.ok) {
              const detail = await detailRes.json();
              const content = detail.content || cachedContent || {};
              try {
                localStorage.setItem('invitation_cache_' + slug, JSON.stringify(content));
              } catch (e) {}

              return {
                _dbId: detail.id,
                id: `invitation-${detail.id}`,
                templateId: detail.template_id || 'luxury-gold',
                status: detail.status || 'active',
                data: content
              };
           }
        }
      } catch (e) {}

      if (cachedContent) {
        return {
          id: `invitation-cached`,
          templateId: cachedMeta?.templateId || "luxury-gold",
          status: "active",
          data: cachedContent
        };
      }

      return null;
    },
    
    async deleteDraft(slug) {
      try {
        localStorage.removeItem('invitation_cache_' + slug);
        localStorage.removeItem('invitation_meta_' + slug);
      } catch (e) {}

      try {
        const all = await this.listAll();
        const item = all.find(i => i.slug === slug);
        if (item && item._dbId) {
          await fetch(`/api/invitations/${item._dbId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
          });
        }
      } catch (e) {}
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
            status: item.status || 'active',
            updatedAt: item.created_at || new Date().toISOString(),
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
})();
