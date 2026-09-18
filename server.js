const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs'); // Módulo para verificar a existência do ficheiro

const app = express();
const PORT = 3000;
const dbFile = './vhd.sqlite';

// Verifica se o VHD já existe antes de iniciar a ligação
const dbExists = fs.existsSync(dbFile);

// Configuração do VHD via SQLite
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error("Erro ao conectar no VHD (SQLite):", err.message);
    } else {
        if (dbExists) {
            console.log("VHD existente detetado e carregado com sucesso.");
        } else {
            console.log("Nenhum VHD encontrado. Novo VHD criado com sucesso.");
        }
    }
});

// Criação da tabela de sistema de arquivos apenas se não existir
db.run(`
    CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        is_url BOOLEAN NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// API para listar arquivos do Floppy/VHD
app.get('/api/fs', (req, res) => {
    db.all("SELECT id, name, type, content, is_url FROM files ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API para salvar arquivo HTML ou vincular URL
app.post('/api/fs', (req, res) => {
    const { name, type, content, isUrl } = req.body;
    db.run(
        "INSERT INTO files (name, type, content, is_url) VALUES (?, ?, ?, ?)",
        [name, type, content, isUrl ? 1 : 0],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, success: true });
        }
    );
});

// API para deletar arquivo
app.delete('/api/fs/:id', (req, res) => {
    db.run("DELETE FROM files WHERE id = ?", req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// Inicia o servidor backend
app.listen(PORT, () => {
    console.log(`Quinzuo OS Static a correr na porta ${PORT}`);
    console.log(`Aceda: http://localhost:${PORT}`);
});