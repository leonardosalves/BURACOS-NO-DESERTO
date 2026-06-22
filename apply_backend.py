import re

with open('dashboard-qanat/backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_upload = """app.post("/api/upload-scene-asset", (req, res) => {
  const projDir = getProjectDir(req);
  const { scene, type, filename } = req.query;
  if (!scene || !type || !filename) {
    return res.status(400).json({ error: "Parâmetros scene, type e filename são obrigatórios." });
  }

  const ext = path.extname(filename).toLowerCase() || (type === "video" ? ".mp4" : ".png");
  const assetsDir = path.join(projDir, "ASSETS");
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const destFileName = cena_;
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

      if (!config.timeline_assets) {
        config.timeline_assets = {};
      }

      const assetItem = {
        asset: destFileName,
        type: type === "video" ? "video" : "image"
      };
      if (type === "video") {
        assetItem.fixed = 8.00;
      }

      config.timeline_assets[String(scene)] = [assetItem];

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
      
      res.json({ 
        success: true, 
        message: Cena  vinculada ao arquivo  com sucesso!,
        asset: destFileName
      });
    } catch (err) {
      res.status(500).json({ error: "Erro ao salvar na configuração", details: err.message });
    }
  });

  writeStream.on("error", (err) => {
    res.status(500).json({ error: "Erro ao escrever arquivo de mídia", details: err.message });
  });
});"""

new_upload = """app.post("/api/upload-scene-asset", (req, res) => {
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
         if (!config.timeline_assets[String(scene)]) config.timeline_assets[String(scene)] = [];
         config.timeline_assets[String(scene)][parseInt(idx)] = assetItem;
      } else {
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

app.post("/api/upload-bgm", (req, res) => {
  const projDir = getProjectDir(req);
  const { block, filename } = req.query;
  if (!block || !filename) return res.status(400).json({ error: "Parâmetros block e filename são obrigatórios." });

  const destFileName = gm_block_.mp3;
  const destFilePath = path.join(projDir, destFileName);
  const writeStream = fs.createWriteStream(destFilePath);

  req.pipe(writeStream);

  writeStream.on("finish", () => {
    const configPath = path.join(projDir, "config_qanat.json");
    try {
      let config = {};
      if (fs.existsSync(configPath)) config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (!config.bgm_mappings) config.bgm_mappings = [];
      
      const existingIdx = config.bgm_mappings.findIndex((m) => m.block === parseInt(block));
      if (existingIdx >= 0) {
        config.bgm_mappings[existingIdx].file = destFileName;
      } else {
        config.bgm_mappings.push({ block: parseInt(block), file: destFileName });
      }

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
      res.json({ success: true, message: BGM atualizado para o bloco  });
    } catch (err) {
      res.status(500).json({ error: "Erro ao salvar config", details: err.message });
    }
  });

  writeStream.on("error", (err) => {
    res.status(500).json({ error: "Erro ao gravar BGM", details: err.message });
  });
});
"""

content = content.replace(old_upload, new_upload)

with open('dashboard-qanat/backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)
