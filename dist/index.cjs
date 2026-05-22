// Point d'entrée Plesk — charge le serveur ESM
import(require("path").resolve(__dirname, "../artifacts/api-server/dist/index.mjs")).catch(
  (err) => { console.error("Erreur démarrage serveur:", err); process.exit(1); }
);
