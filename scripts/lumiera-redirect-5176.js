// Redireciona :5176 -> :3005 (compatibilidade com bookmarks/atalhos antigos no modo uniport).
const http = require("http");

const PORT = 5176;
const HOST = "127.0.0.1";
const TARGET = "http://127.0.0.1:3005";

const server = http.createServer((req, res) => {
  const path = req.url || "/";
  res.writeHead(302, { Location: `${TARGET}${path}` });
  res.end();
});

server.listen(PORT, HOST, () => {
  console.log(`[Lumiera] redirect ${HOST}:${PORT} -> ${TARGET}`);
});
