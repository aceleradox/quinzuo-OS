const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;
const dbFile = './vhd.sqlite';

const dbExists = fs.existsSync(dbFile);

const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error("Erro ao conectar no VHD (SQLite):", err.message);
    } else {
        console.log(dbExists ? "VHD existente montado." : "Novo VHD criado.");
        
        db.run(`
            CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                content TEXT NOT NULL,
                is_url BOOLEAN NOT NULL DEFAULT 0,
                trashed BOOLEAN NOT NULL DEFAULT 0,
                partition_id INTEGER NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (!err) {
                // Auto-correção para BDs anteriores (Lixeira e Partições)
                db.run("ALTER TABLE files ADD COLUMN trashed BOOLEAN NOT NULL DEFAULT 0", () => {});
                db.run("ALTER TABLE files ADD COLUMN partition_id INTEGER NOT NULL DEFAULT 1", () => {});
            }
        });
    }
});

app.use(bodyParser.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/ping', (req, res) => res.json({ status: 'alive' }));

// Retorna ficheiros normais
app.get('/api/fs', (req, res) => {
    db.all("SELECT id, name, type, content, is_url, partition_id FROM files WHERE trashed = 0 ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Retorna lixeira
app.get('/api/fs/trash', (req, res) => {
    db.all("SELECT id, name, type, content, is_url, partition_id FROM files WHERE trashed = 1 ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Guardar novo ficheiro com partição
app.post('/api/fs', (req, res) => {
    const { name, type, content, isUrl, partitionId } = req.body;
    db.run("INSERT INTO files (name, type, content, is_url, trashed, partition_id) VALUES (?, ?, ?, ?, 0, ?)",
        [name, type, content, isUrl ? 1 : 0, partitionId || 1],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, success: true });
        }
    );
});

app.put('/api/fs/:id', (req, res) => {
    db.run("UPDATE files SET name = ? WHERE id = ?", [req.body.name, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message }); res.json({ updated: this.changes });
    });
});

app.put('/api/fs/:id/trash', (req, res) => {
    db.run("UPDATE files SET trashed = 1 WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message }); res.json({ trashed: this.changes });
    });
});

app.put('/api/fs/:id/restore', (req, res) => {
    db.run("UPDATE files SET trashed = 0 WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message }); res.json({ restored: this.changes });
    });
});

app.delete('/api/fs/:id', (req, res) => {
    db.run("DELETE FROM files WHERE id = ?", req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message }); res.json({ deleted: this.changes });
    });
});

app.post('/api/terminal', (req, res) => {
    const { command } = req.body;
    if (!command) return res.json({ output: '' });
    const cmd = command.trim();

    if (cmd === 'help') return res.json({ output: 'Comandos Quinzuo OS:\n- help\n- clear\n- vhd\nComandos host permitidos.' });
    if (cmd === 'vhd') {
        db.all("SELECT id, name, partition_id, trashed FROM files", [], (err, rows) => {
            if (err) return res.json({ output: `Erro DB: ${err.message}` });
            const list = rows.map(r => `[ID: ${r.id}] ${r.name} (VHD ${r.partition_id}) (Lixo: ${r.trashed ? 'S' : 'N'})`).join('\n');
            return res.json({ output: `Arquivos no VHD:\n${list}` });
        }); return;
    }

    exec(cmd, (error, stdout, stderr) => {
        let output = '';
        if (error) output += `Erro: ${error.message}\n`;
        if (stderr) output += `${stderr}\n`;
        if (stdout) output += stdout;
        res.json({ output: output || 'Executado.' });
    });
});

app.listen(PORT, () => console.log(`Quinzuo OS Static rodando na porta ${PORT}`));