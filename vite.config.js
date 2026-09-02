import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

function templateListPlugin() {
  const templatesDir = path.resolve(__dirname, 'templates');
  const outputFile = path.resolve(__dirname, 'templates/templates-list.json');

  function generateList() {
    try {
      if (!fs.existsSync(templatesDir)) return;
      const dirs = fs.readdirSync(templatesDir);
      const templates = [];

      for (const dir of dirs) {
        const fullPath = path.join(templatesDir, dir);
        // Abaikan jika bukan direktori
        const stat = fs.statSync(fullPath);
        if (!stat.isDirectory()) continue;

        const manifestPath = path.join(fullPath, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          try {
            const content = fs.readFileSync(manifestPath, 'utf-8');
            const manifest = JSON.parse(content);
            
            // Masukkan data template dengan ID sesuai nama foldernya
            templates.push({
              id: dir,
              title: manifest.title || dir.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
              name: manifest.name || manifest.title || dir,
              description: manifest.description || 'Desain undangan digital premium.',
              tags: manifest.tags || [],
              preview: manifest.preview ? `templates/${dir}/${manifest.preview}` : null,
              features: manifest.features || [],
              editable: manifest.editable || {}
            });
          } catch (err) {
            console.error(`Gagal membaca manifest.json di ${dir}:`, err);
          }
        }
      }

      fs.writeFileSync(outputFile, JSON.stringify(templates, null, 2), 'utf-8');
      console.log('Successfully generated templates-list.json');
    } catch (e) {
      console.error('Failed to generate template list:', e);
    }
  }

  return {
    name: 'vite-plugin-template-list',
    buildStart() {
      generateList();
    },
    configureServer(server) {
      // Pantau file manifest.json di semua subfolder templates
      server.watcher.add(path.join(templatesDir, '**/manifest.json'));
      
      const handleChange = (filePath) => {
        if (filePath.includes('manifest.json')) {
          generateList();
        }
      };

      server.watcher.on('add', handleChange);
      server.watcher.on('change', handleChange);
      server.watcher.on('unlink', handleChange);
    }
  };
}

export default defineConfig({
  plugins: [templateListPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
// restart trigger to rebuild templates catalog - 5 templates
