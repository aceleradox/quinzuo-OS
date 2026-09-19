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
        console.log(dbExists ? "VHD existente montado com sucesso." : "Novo VHD criado com sucesso.");
        
        // 1. Cria a tabela base se não existir
        db.run(`
            CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                content TEXT NOT NULL,
                is_url BOOLEAN NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (!err) {
                // 2. AUTO-CORREÇÃO: Injeta a coluna da Lixeira caso o VHD seja da versão anterior
                db.run("ALTER TABLE files ADD COLUMN trashed BOOLEAN NOT NULL DEFAULT 0", (alterErr) => {
                    if (!alterErr) console.log("✔️ VHD antigo atualizado automaticamente para suportar a Lixeira!");
                });
            }
        });
    }
});

app.use(bodyParser.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rota de Batimento Cardíaco (para o BSOD não disparar à toa)
app.get('/api/ping', (req, res) => res.json({ status: 'alive' }));

// Lista ficheiros normais (Área de Trabalho)
app.get('/api/fs', (req, res) => {
    db.all("SELECT id, name, type, content, is_url FROM files WHERE trashed = 0 ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Lista ficheiros na lixeira
app.get('/api/fs/trash', (req, res) => {
    db.all("SELECT id, name, type, content, is_url FROM files WHERE trashed = 1 ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Salvar novo ficheiro
app.post('/api/fs', (req, res) => {
    const { name, type, content, isUrl } = req.body;
    db.run("INSERT INTO files (name, type, content, is_url, trashed) VALUES (?, ?, ?, ?, 0)",
        [name, type, content, isUrl ? 1 : 0],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, success: true });
        }
    );
});

// Renomear ficheiro
app.put('/api/fs/:id', (req, res) => {
    const { name } = req.body;
    db.run("UPDATE files SET name = ? WHERE id = ?", [name, req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ updated: this.changes });
    });
});

// Enviar para a Lixeira (Soft Delete)
app.put('/api/fs/:id/trash', (req, res) => {
    db.run("UPDATE files SET trashed = 1 WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ trashed: this.changes });
    });
});

// Restaurar da Lixeira
app.put('/api/fs/:id/restore', (req, res) => {
    db.run("UPDATE files SET trashed = 0 WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ restored: this.changes });
    });
});

// Excluir permanentemente (Hard Delete)
app.delete('/api/fs/:id', (req, res) => {
    db.run("DELETE FROM files WHERE id = ?", req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
    });
});

// Comunicação do Terminal
app.post('/api/terminal', (req, res) => {
    const { command } = req.body;
    if (!command) return res.json({ output: '' });
    const cmd = command.trim();

    if (cmd === 'help') return res.json({ output: 'Comandos Quinzuo OS:\n- help\n- clear\n- vhd\nComandos host permitidos.' });
    if (cmd === 'vhd') {
        db.all("SELECT id, name, type, trashed FROM files", [], (err, rows) => {
            if (err) return res.json({ output: `Erro DB: ${err.message}` });
            const list = rows.map(r => `[ID: ${r.id}] ${r.name} (Lixo: ${r.trashed ? 'Sim' : 'Não'})`).join('\n');
            return res.json({ output: `Arquivos no VHD:\n${list}` });
        });
        return;
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