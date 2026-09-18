const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process'); // Módulo para o Terminal

const app = express();
const PORT = 3000;
const dbFile = './vhd.sqlite';

const dbExists = fs.existsSync(dbFile);

const db = new sqlite3.Database(dbFile, (err) => {
    if (err) console.error("Erro ao conectar no VHD (SQLite):", err.message);
    else console.log(dbExists ? "VHD existente montado com sucesso." : "Novo VHD criado com sucesso.");
});

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

app.use(bodyParser.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------
// ROTAS DO SISTEMA DE ARQUIVOS (VHD)
// ----------------------------------------------------
app.get('/api/fs', (req, res) => {
    db.all("SELECT id, name, type, content, is_url FROM files ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

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

app.put('/api/fs/:id', (req, res) => {
    const { name } = req.body;
    db.run("UPDATE files SET name = ? WHERE id = ?", [name, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});

app.delete('/api/fs/:id', (req, res) => {
    db.run("DELETE FROM files WHERE id = ?", req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// ----------------------------------------------------
// ROTA DO TERMINAL (CHILD PROCESS)
// ----------------------------------------------------
app.post('/api/terminal', (req, res) => {
    const { command } = req.body;
    if (!command) return res.json({ output: '' });

    const cmd = command.trim();

    // Comandos Simulados (Camada Quinzuo OS)
    if (cmd === 'help') {
        return res.json({ output: 'Comandos Quinzuo OS:\n- help : Mostra esta mensagem\n- clear : Limpa o terminal na UI\n- vhd : Lista todos os arquivos salvos no SQLite\n\nOutros comandos (ex: dir, ls, node -v) serão executados via child_process no host.' });
    }
    
    if (cmd === 'vhd') {
        db.all("SELECT id, name, type FROM files", [], (err, rows) => {
            if (err) return res.json({ output: `Erro DB: ${err.message}` });
            if (rows.length === 0) return res.json({ output: 'VHD está vazio.' });
            const list = rows.map(r => `[ID: ${r.id}] ${r.name} (${r.type})`).join('\n');
            return res.json({ output: `Arquivos no VHD (SQLite):\n${list}` });
        });
        return;
    }

    // Comandos Reais (Camada Host via child_process)
    exec(cmd, (error, stdout, stderr) => {
        let output = '';
        if (error) output += `Erro Interno: ${error.message}\n`;
        if (stderr) output += `${stderr}\n`;
        if (stdout) output += stdout;
        
        res.json({ output: output || 'Executado sem retorno.' });
    });
});

app.listen(PORT, () => {
    console.log(`Quinzuo OS Static rodando na porta ${PORT}`);
});