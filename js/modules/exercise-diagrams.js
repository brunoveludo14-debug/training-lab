/**
 * exercise-diagrams.js — Diagramas visuais pré-definidos para os 30 exercícios da biblioteca
 * Cada diagrama possui:
 * - players: array de { id, cls, x, y, label }
 * - objects: array de { type, x, y, rx, ry } (cone, mini-goal, ladder, ball)
 * - shapes: array de { type, stroke, fill, points: [{x, y}], label, thick }
 */
'use strict';

const DIAGRAMS = {
  // 🔥 Aquecimento
  'pre_01': { // Rondo 4v1
    players: [
      { id: 'p1', cls: 'f', x: 30, y: 12, label: '2' },
      { id: 'p2', cls: 'f', x: 38, y: 12, label: '3' },
      { id: 'p3', cls: 'f', x: 38, y: 20, label: '4' },
      { id: 'p4', cls: 'f', x: 30, y: 20, label: '5' },
      { id: 'p5', cls: 'opp', x: 34, y: 16, label: '6' }
    ],
    objects: [
      { type: 'ball', x: 31.5, y: 13 },
      { type: 'cone', x: 28, y: 10 },
      { type: 'cone', x: 40, y: 10 },
      { type: 'cone', x: 40, y: 22 },
      { type: 'cone', x: 28, y: 22 }
    ],
    shapes: [
      { type: 'dashed-arrow', stroke: 'rgba(251,191,36,0.9)', points: [{ x: 31, y: 12.5 }, { x: 37, y: 12.5 }] },
      { type: 'arrow', stroke: 'rgba(77,184,255,0.9)', points: [{ x: 34, y: 16 }, { x: 35.5, y: 13.5 }] }
    ]
  },
  'pre_04': { // Passe em Quadrado
    players: [
      { id: 'p1', cls: 'f', x: 15, y: 15, label: '2' },
      { id: 'p2', cls: 'f', x: 53, y: 15, label: '3' },
      { id: 'p3', cls: 'f', x: 53, y: 53, label: '4' },
      { id: 'p4', cls: 'f', x: 15, y: 53, label: '5' }
    ],
    objects: [
      { type: 'ball', x: 16.5, y: 15 },
      { type: 'cone', x: 13, y: 13 },
      { type: 'cone', x: 55, y: 13 },
      { type: 'cone', x: 55, y: 55 },
      { type: 'cone', x: 13, y: 55 }
    ],
    shapes: [
      { type: 'dashed-arrow', stroke: 'rgba(255,255,255,0.9)', points: [{ x: 17, y: 15 }, { x: 50, y: 15 }] },
      { type: 'arrow', stroke: 'rgba(57,224,122,0.9)', points: [{ x: 15, y: 17 }, { x: 15, y: 50 }] }
    ]
  },

  // ⚽ Posse de Bola
  'pre_06': { // Meinho 5v2
    players: [
      { id: 'p1', cls: 'f', x: 25, y: 25, label: '2' },
      { id: 'p2', cls: 'f', x: 43, y: 25, label: '3' },
      { id: 'p3', cls: 'f', x: 43, y: 43, label: '4' },
      { id: 'p4', cls: 'f', x: 25, y: 43, label: '5' },
      { id: 'p5', cls: 'f', x: 34, y: 34, label: '8' },
      { id: 'p6', cls: 'opp', x: 31, y: 31, label: '6' },
      { id: 'p7', cls: 'opp', x: 37, y: 37, label: '7' }
    ],
    objects: [
      { type: 'ball', x: 26.5, y: 25 },
      { type: 'cone', x: 23, y: 23 },
      { type: 'cone', x: 45, y: 23 },
      { type: 'cone', x: 45, y: 45 },
      { type: 'cone', x: 23, y: 45 }
    ],
    shapes: [
      { type: 'dashed-arrow', stroke: 'rgba(251,191,36,0.9)', points: [{ x: 27, y: 26 }, { x: 33, y: 33 }] }
    ]
  },
  'pre_07': { // Posse 6v6+2 Jokers
    players: [
      { id: 'p1', cls: 'f', x: 15, y: 20, label: '2' },
      { id: 'p2', cls: 'f', x: 25, y: 35, label: '4' },
      { id: 'p3', cls: 'f', x: 50, y: 25, label: '8' },
      { id: 'p4', cls: 'opp', x: 20, y: 25, label: '5' },
      { id: 'p5', cls: 'opp', x: 35, y: 30, label: '7' },
      { id: 'p6', cls: 'opp', x: 48, y: 35, label: '9' },
      { id: 'p7', cls: 'f', x: 34, y: 15, label: 'J1' } // Joker
    ],
    objects: [
      { type: 'ball', x: 26.5, y: 35 },
      { type: 'cone', x: 10, y: 10 },
      { type: 'cone', x: 58, y: 10 },
      { type: 'cone', x: 58, y: 50 },
      { type: 'cone', x: 10, y: 50 }
    ],
    shapes: [
      { type: 'zone', stroke: 'rgba(77,184,255,0.4)', fill: 'rgba(77,184,255,0.05)', points: [{ x: 10, y: 10 }, { x: 58, y: 10 }, { x: 58, y: 50 }, { x: 10, y: 50 }] },
      { type: 'dashed-arrow', stroke: 'rgba(255,255,255,0.8)', points: [{ x: 26, y: 34 }, { x: 34, y: 16 }] }
    ]
  },

  // 🎯 Finalização
  'pre_11': { // Finalização após Combinação
    players: [
      { id: 'p1', cls: 'f', x: 34, y: 40, label: '8' },
      { id: 'p2', cls: 'f', x: 25, y: 25, label: '10' },
      { id: 'p3', cls: 'f', x: 43, y: 25, label: '9' },
      { id: 'p4', cls: 'gk', x: 34, y: 4, label: '1' }
    ],
    objects: [
      { type: 'ball', x: 34, y: 42 },
      { type: 'cone', x: 25, y: 27 },
      { type: 'cone', x: 43, y: 27 }
    ],
    shapes: [
      { type: 'dashed-arrow', stroke: 'rgba(251,191,36,0.9)', points: [{ x: 34, y: 40 }, { x: 26, y: 26 }] },
      { type: 'dashed-arrow', stroke: 'rgba(251,191,36,0.9)', points: [{ x: 26, y: 25 }, { x: 41, y: 25 }] },
      { type: 'arrow', stroke: 'rgba(57,224,122,0.9)', points: [{ x: 43, y: 24 }, { x: 38, y: 12 }] },
      { type: 'dashed-arrow', stroke: 'rgba(248,113,113,0.9)', points: [{ x: 38, y: 12 }, { x: 34.5, y: 5 }] }
    ]
  },
  'pre_12': { // 1v1 com GR
    players: [
      { id: 'p1', cls: 'f', x: 34, y: 48, label: '9' },
      { id: 'p2', cls: 'opp', x: 34, y: 30, label: '4' },
      { id: 'p3', cls: 'gk', x: 34, y: 4, label: '1' }
    ],
    objects: [
      { type: 'ball', x: 34, y: 50 },
      { type: 'cone', x: 24, y: 35 },
      { type: 'cone', x: 44, y: 35 }
    ],
    shapes: [
      { type: 'arrow', stroke: 'rgba(57,224,122,0.9)', points: [{ x: 34, y: 47 }, { x: 29, y: 35 }, { x: 33, y: 20 }] },
      { type: 'arrow', stroke: 'rgba(248,113,113,0.9)', points: [{ x: 34, y: 30 }, { x: 33, y: 22 }] },
      { type: 'dashed-arrow', stroke: 'rgba(248,113,113,0.9)', points: [{ x: 33, y: 20 }, { x: 34, y: 5 }] }
    ]
  },

  // 🏃 Físico
  'pre_19': { // Agilidade com Escada
    players: [
      { id: 'p1', cls: 'f', x: 34, y: 60, label: '7' },
      { id: 'p2', cls: 'f', x: 34, y: 66, label: '11' }
    ],
    objects: [
      { type: 'ladder', x: 34, y: 40, rx: 4, ry: 15 },
      { type: 'cone', x: 30, y: 20 },
      { type: 'cone', x: 38, y: 20 }
    ],
    shapes: [
      { type: 'arrow', stroke: 'rgba(57,224,122,0.9)', points: [{ x: 34, y: 58 }, { x: 34, y: 24 }] },
      { type: 'arrow', stroke: 'rgba(77,184,255,0.9)', points: [{ x: 34, y: 22 }, { x: 31, y: 20 }, { x: 31, y: 58 }] }
    ]
  },

  // 🧠 Tático
  'pre_21': { // Saída de Bola (GR+4)
    players: [
      { id: 'p1', cls: 'gk', x: 34, y: 95, label: '1' },
      { id: 'p2', cls: 'f', x: 20, y: 85, label: '3' },
      { id: 'p3', cls: 'f', x: 48, y: 85, label: '4' },
      { id: 'p4', cls: 'f', x: 10, y: 70, label: '2' },
      { id: 'p5', cls: 'f', x: 58, y: 70, label: '5' },
      { id: 'p6', cls: 'opp', x: 28, y: 72, label: '9' },
      { id: 'p7', cls: 'opp', x: 40, y: 72, label: '11' }
    ],
    objects: [
      { type: 'ball', x: 34, y: 92 }
    ],
    shapes: [
      { type: 'dashed-arrow', stroke: 'rgba(255,255,255,0.9)', points: [{ x: 34, y: 92 }, { x: 21, y: 86 }] }
    ]
  }
};

/**
 * Retorna o diagrama de um exercício. Se não existir pré-definido,
 * gera um diagrama genérico baseado na categoria do exercício.
 */
export function getExerciseDiagram(exerciseId, category = 'aquecimento') {
  if (DIAGRAMS[exerciseId]) return DIAGRAMS[exerciseId];

  // Fallback diagrams based on category to ensure visual representation for ALL
  switch (category) {
    case 'aquecimento':
      return {
        players: [
          { id: 'p1', cls: 'f', x: 24, y: 24, label: '1' },
          { id: 'p2', cls: 'f', x: 44, y: 24, label: '2' },
          { id: 'p3', cls: 'f', x: 34, y: 44, label: '3' }
        ],
        objects: [
          { type: 'cone', x: 20, y: 20 },
          { type: 'cone', x: 48, y: 20 },
          { type: 'cone', x: 34, y: 48 },
          { type: 'ball', x: 26, y: 24 }
        ],
        shapes: [
          { type: 'dashed-arrow', stroke: 'rgba(255,255,255,0.8)', points: [{ x: 26, y: 24 }, { x: 42, y: 24 }] }
        ]
      };
    case 'posse':
      return {
        players: [
          { id: 'p1', cls: 'f', x: 20, y: 20, label: 'A' },
          { id: 'p2', cls: 'f', x: 48, y: 40, label: 'B' },
          { id: 'p3', cls: 'opp', x: 34, y: 30, label: 'X' }
        ],
        objects: [
          { type: 'cone', x: 15, y: 15 },
          { type: 'cone', x: 53, y: 15 },
          { type: 'cone', x: 53, y: 45 },
          { type: 'cone', x: 15, y: 45 },
          { type: 'ball', x: 22, y: 21 }
        ],
        shapes: [
          { type: 'zone', stroke: 'rgba(57,224,122,0.4)', fill: 'rgba(57,224,122,0.05)', points: [{ x: 15, y: 15 }, { x: 53, y: 15 }, { x: 53, y: 45 }, { x: 15, y: 45 }] }
        ]
      };
    case 'finalizacao':
      return {
        players: [
          { id: 'p1', cls: 'f', x: 34, y: 40, label: '9' },
          { id: 'p2', cls: 'gk', x: 34, y: 4, label: '1' }
        ],
        objects: [
          { type: 'ball', x: 34, y: 42 },
          { type: 'cone', x: 25, y: 20 },
          { type: 'cone', x: 43, y: 20 }
        ],
        shapes: [
          { type: 'arrow', stroke: 'rgba(57,224,122,0.9)', points: [{ x: 34, y: 39 }, { x: 34, y: 18 }] },
          { type: 'dashed-arrow', stroke: 'rgba(248,113,113,0.9)', points: [{ x: 34, y: 18 }, { x: 34, y: 5 }] }
        ]
      };
    case 'fisico':
      return {
        players: [
          { id: 'p1', cls: 'f', x: 34, y: 45, label: '🏃' }
        ],
        objects: [
          { type: 'cone', x: 34, y: 15 },
          { type: 'cone', x: 34, y: 50 },
          { type: 'cone', x: 25, y: 32.5 },
          { type: 'cone', x: 43, y: 32.5 }
        ],
        shapes: [
          { type: 'arrow', stroke: 'rgba(77,184,255,0.9)', points: [{ x: 34, y: 43 }, { x: 26, y: 33 }, { x: 34, y: 17 }, { x: 42, y: 33 }, { x: 34, y: 44 }] }
        ]
      };
    case 'tatico':
      return {
        players: [
          { id: 'p1', cls: 'f', x: 20, y: 65, label: '3' },
          { id: 'p2', cls: 'f', x: 48, y: 65, label: '4' },
          { id: 'p3', cls: 'opp', x: 34, y: 45, label: '9' }
        ],
        objects: [
          { type: 'ball', x: 21, y: 63 }
        ],
        shapes: [
          { type: 'dashed-arrow', stroke: 'rgba(255,255,255,0.8)', points: [{ x: 22, y: 64 }, { x: 46, y: 65 }] }
        ]
      };
    default:
      return {
        players: [
          { id: 'p1', cls: 'f', x: 34, y: 30, label: '1' }
        ],
        objects: [
          { type: 'cone', x: 34, y: 25 }
        ],
        shapes: []
      };
  }
}
