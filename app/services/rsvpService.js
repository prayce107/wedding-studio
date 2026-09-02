const RSVP_KEY = "weddingPremiumRSVP";

const rsvpService = {
  async get() {
    try {
      return JSON.parse(localStorage.getItem(RSVP_KEY) || "[]");
    } catch (e) {
      console.error("Failed to read RSVP", e);
      return [];
    }
  },

  async submit(item) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      const r = await this.get();
      r.unshift({
        ...item,
        time: new Date().toLocaleString("id-ID")
      });
      localStorage.setItem(RSVP_KEY, JSON.stringify(r));
      return { success: true, data: r };
    } catch (e) {
      console.error("Failed to submit RSVP", e);
      throw new Error("Gagal menyimpan RSVP");
    }
  },

  async delete(index) {
    try {
      const r = await this.get();
      r.splice(index, 1);
      localStorage.setItem(RSVP_KEY, JSON.stringify(r));
      return { success: true, data: r };
    } catch (e) {
      console.error("Failed to delete RSVP item", e);
      throw new Error("Gagal menghapus item RSVP");
    }
  },

  async clear() {
    try {
      localStorage.removeItem(RSVP_KEY);
      return { success: true };
    } catch (e) {
      console.error("Failed to clear RSVPs", e);
      throw new Error("Gagal mengosongkan RSVP");
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = rsvpService;
} else {
  window.rsvpService = rsvpService;
}
