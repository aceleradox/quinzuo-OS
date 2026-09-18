# 🧠 Quinzuo OS Static

O **Quinzuo OS Static** é um sistema operativo web cognitivo e simulado, desenhado para correr diretamente no browser. Possui uma interface gráfica com janelas, uma *Dock* estilo macOS, e um backend em Node.js com SQLite que atua como um Disco Rígido Virtual (VHD) para guardar ficheiros e aplicações.

## ✨ Funcionalidades Principais

* **Gestor de Janelas:** Abre, arrasta e fecha aplicações em janelas independentes.
* **Motor de Áudio HQ (Web Audio API):** Efeitos sonoros gerados dinamicamente para o arranque do sistema (boot), cliques na interface e ações de abrir/fechar janelas. Sem necessidade de ficheiros MP3/WAV pesados.
* **Disco Rígido Virtual (VHD):** Backend em SQLite que permite guardar notas, submeter ficheiros HTML ou vincular URLs (iframes) que ficam gravados permanentemente no sistema.
* **Temas e Modos Cognitivos:**
  * **Modo Valsa:** O ambiente desktop padrão (elegante e noturno).
  * **Modo Baile Funk:** Tema escuro modificado com tons néon (rosa e verde).
  * Opções de "Virtualizar maturidade precoce (VM-Q)" e "Modo Cognitivo Supremo".
* **Aplicações Integradas:** 
  * 💾 **Drive Floppy (VHD):** Gestor de ficheiros local.
  * 💼 **Quinzuo Office:** Suíte de produtividade.
  * 📝 **Bloco de Notas:** Para anotações rápidas.
  * 🌐 **Web Frame (Navegador):** Navegador interno por iframe.
  * 🗑️ **Lixeira:** Gestão de ficheiros.

## 🛠️ Tecnologias Utilizadas

* **Frontend:** HTML5, CSS3, Tailwind CSS, Vanilla JavaScript (ES6+), Web Audio API.
* **Backend:** Node.js, Express.js.
* **Base de Dados:** SQLite3 (funcionando como VHD).

## 📁 Estrutura de Ficheiros

Para que o sistema funcione corretamente, a tua pasta deve estar organizada da seguinte forma:

```text
quinzuo-os-static/
├── node_modules/       # Criado automaticamente após o npm install
├── public/             # Diretório obrigatório para ficheiros estáticos
│   └── index.html      # O código do frontend (Interface, Áudio, Janelas)
├── server.js           # O código do backend (API e ligação SQLite)
├── package.json        # Gestor de dependências do Node.js
└── vhd.sqlite          # (Criado automaticamente) A tua base de dados virtual
