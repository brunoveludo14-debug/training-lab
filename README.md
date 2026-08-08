# Training Lab

Training Lab é uma aplicação estática de planeamento e gestão de treinos de futebol.

## Visão geral

A app permite:
- criar e gerir sessões de treino;
- consultar uma biblioteca de exercícios pré-definida;
- adicionar exercícios personalizados;
- controlar duração, pausas, séries e calendário;
- exportar/importar backups em JSON;
- iniciar o cronómetro do treino;
- trabalhar com um editor visual do campo para desenhos e diagramas.

## Estrutura

- `index.html` — layout shell e views principais.
- `css/style.css` — stylesheet principal.
- `js/app.js` — ponto de entrada e orquestração de views.
- `js/modules/*` — módulos de domínio: exercícios, sessões, jogadores, calendário, timer, storage, export/import, editor.
- `manifest.json` — configuração do PWA.
- `sw.js` — service worker de cache offline.

## Desenvolvimento local

Serve a aplicação com qualquer servidor estático, por exemplo:

```bash
python -m http.server 4173
```

Depois abre:

http://localhost:4173/index.html

## Testes

```bash
npm test
```
