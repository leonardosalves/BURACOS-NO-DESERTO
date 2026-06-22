import re

with open('dashboard-qanat/backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Update upload-scene-asset to handle idx
replacement = """app.post("/api/upload-scene-asset", (req, res) => {
  const projDir = getProjectDir(req);
  const { scene, type, filename, idx } = req.query;
  if (!scene || !type || !filename) {
    return res.status(400).json({ error: "Parâmetros scene, type e filename são obrigatórios." });
  }

  const ext = path.extname(filename).toLowerCase() || (type === "video" ? ".mp4" : ".png");
  const assetsDir = path.join(projDir, "ASSETS");
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const destFileName = cena__;
  const destFilePath = path.join(assetsDir, destFileName);
  const writeStream = fs.createWriteStream(destFilePath);

  req.pipe(writeStream);

  writeStream.on("finish", () => {
    const configPath = path.join(projDir, "config_qanat.json");
    try {
      let config = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      }

      if (!config.timeline_assets) config.timeline_assets = {};
      
      const assetItem = { asset: destFileName, type: type === "video" ? "video" : "image" };
      if (type === "video") assetItem.fixed = 8.00;

      if (idx !== undefined) {
         // Replaces existing asset at idx
         if (!config.timeline_assets[String(scene)]) config.timeline_assets[String(scene)] = [];
         config.timeline_assets[String(scene)][parseInt(idx)] = assetItem;
      } else {
         // In script master, scene is a scene number, not block. So we just save it.
         config.timeline_assets[String(scene)] = [assetItem];
      }

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
      
      res.json({ success: true, message: Mídia associada à cena/bloco  com sucesso!, asset: destFileName });
    } catch (err) {
      res.status(500).json({ error: "Erro ao salvar na configuração", details: err.message });
    }
  });

  writeStream.on("error", (err) => {
    res.status(500).json({ error: "Erro ao escrever arquivo de mídia", details: err.message });
  });
});

// API: Binary stream upload for specific block BGM
app.post("/api/upload-bgm", (req, res) => {
  const projDir = getProjectDir(req);
  const { block } = req.query;
  if (!block) {
    return res.status(400).json({ error: "Parâmetro block é obrigatório." });
  }

  // we use a simple multiparty / busboy or just stream if we send it as binary like the others.
  // Wait, in frontend we used FormData for BGM upload! We need to parse FormData.
  // Actually, let's just make frontend send binary like scene upload to keep it consistent and avoid multer!
"""

# Wait, in the frontend I used FormData for upload-bgm. Let me fix the python script to just use the same stream approach instead.
