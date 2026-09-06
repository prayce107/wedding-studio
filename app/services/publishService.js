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

  const getIdb = () => {
    return window.idbStore || (window.storageService && window.storageService.idb) || null;
  };

  const publishService = {
    async saveDraft(slug, invitation) {
      const token = getToken();
      const idb = getIdb();

      // 1. Always save to high-capacity IndexedDB first (no 5MB quota limit)
      if (idb && invitation && invitation.data) {
        try {
          await idb.set('invitation_cache_' + slug, invitation.data);
          await idb.set('invitation_meta_' + slug, {
            slug,
            templateId: invitation.templateId || "luxury-gold",
            title: invitation.data?.general?.name1 ? `${invitation.data.general.name1} & ${invitation.data.general.name2}` : slug,
            updatedAt: new Date().toISOString()
          });
        } catch (idbErr) {
          console.warn('IndexedDB save warning:', idbErr);
        }
      }

      // 2. Safely attempt LocalStorage caching (wrapped so QuotaExceededError is non-fatal)
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
      } catch (lsErr) {
        console.warn('LocalStorage quota notice (IndexedDB is handling large payload):', lsErr);
      }

      if (!token) {
        return { success: true, offline: true };
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
            status: "active",
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
      const idb = getIdb();

      // Cache locally in IndexedDB & LocalStorage
      if (idb && invitation && invitation.data) {
        try {
          await idb.set('invitation_cache_' + slug, invitation.data);
        } catch (e) {}
      }
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
      const idb = getIdb();
      let cachedContent = null;
      let cachedMeta = null;

      // 1. Try IndexedDB first (high-capacity, uncompressed photos)
      if (idb) {
        try {
          cachedContent = await idb.get('invitation_cache_' + slug);
          cachedMeta = await idb.get('invitation_meta_' + slug);
        } catch (e) {}
      }

      // 2. Try LocalStorage fallback
      if (!cachedContent) {
        try {
          const c = localStorage.getItem('invitation_cache_' + slug);
          if (c) cachedContent = JSON.parse(c);
          const m = localStorage.getItem('invitation_meta_' + slug);
          if (m) cachedMeta = JSON.parse(m);
        } catch (e) {}
      }

      // 3. Try Remote Server API
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
              if (idb) {
                try { await idb.set('invitation_cache_' + slug, content); } catch (e) {}
              }
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
      const idb = getIdb();
      if (idb) {
        try {
          await idb.del('invitation_cache_' + slug);
          await idb.del('invitation_meta_' + slug);
        } catch (e) {}
      }
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
