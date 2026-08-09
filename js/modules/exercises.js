/**
 * exercises.js — Biblioteca de exercícios pré-definidos + CRUD custom
 */
'use strict';

import { getCustomExercises, saveCustomExercise, deleteCustomExercise, generateId } from './storage.js';
import { getExerciseDiagram } from './exercise-diagrams.js';

// ─── Categories ────────────────────────────────────────────────────────────────

export const CATEGORIES = [
  { key: 'aquecimento',  label: 'Aquecimento',    icon: '🔥', color: 'var(--yel)' },
  { key: 'posse',        label: 'Posse de Bola',  icon: '⚽', color: 'var(--acc)' },
  { key: 'finalizacao',  label: 'Finalização',    icon: '🎯', color: 'var(--red)' },
  { key: 'fisico',       label: 'Físico',         icon: '🏃', color: 'var(--blu)' },
  { key: 'tatico',       label: 'Tático',         icon: '🧠', color: 'var(--pur)' },
  { key: 'retorno',      label: 'Retorno à Calma',icon: '🧊', color: '#64c8dc' },
];

export function getCategoryInfo(key) {
  return CATEGORIES.find(c => c.key === key) || CATEGORIES[0];
}

// ─── Pre-defined exercises (seed library) ──────────────────────────────────────

export const PRESET_EXERCISES = [
  // ── Aquecimento ──
  {
    id: 'pre_01', category: 'aquecimento',
    name: 'Rondo 4v1',
    desc: 'Posse em espaço reduzido com 4 jogadores contra 1 pressionante. Foco em passe curto e receção orientada.',
    duration: 8, sets: 3, rest: 1, players: '5',
  },
  {
    id: 'pre_02', category: 'aquecimento',
    name: 'Mobilidade Articular',
    desc: 'Rotações de tornozelo, joelhos, anca, tronco e ombros. Progressivo do estático ao dinâmico.',
    duration: 5, sets: 1, rest: 0, players: 'Todos',
  },
  {
    id: 'pre_03', category: 'aquecimento',
    name: 'Corrida Progressiva',
    desc: 'Corrida suave com mudanças de ritmo progressivas: trote → 60% → 80%. Incluir skippings e deslocamentos laterais.',
    duration: 8, sets: 1, rest: 0, players: 'Todos',
  },
  {
    id: 'pre_04', category: 'aquecimento',
    name: 'Passe e Movimento em Quadrado',
    desc: 'Quadrado de 10x10m. Passe ao parceiro e correr para a posição seguinte. Variantes: 1 toque, 2 toques.',
    duration: 7, sets: 2, rest: 1, players: '8-12',
  },
  {
    id: 'pre_05', category: 'aquecimento',
    name: 'Jogo do Espelho',
    desc: 'Em pares frente a frente, um lidera movimentos (deslocamentos, agachamentos, sprints curtos) e o outro replica.',
    duration: 5, sets: 2, rest: 1, players: 'Todos (pares)',
  },

  // ── Posse de Bola ──
  {
    id: 'pre_06', category: 'posse',
    name: 'Meínho 5v2',
    desc: 'Espaço 8x8m. 5 atacantes mantêm posse contra 2 defensores. Máximo 2 toques. Quem perde vai ao meio.',
    duration: 10, sets: 3, rest: 2, players: '7',
  },
  {
    id: 'pre_07', category: 'posse',
    name: 'Posse 6v6+2 Jokers',
    desc: 'Campo 30x20m. Duas equipas de 6 + 2 jokers neutros. Objetivo: 8 passes consecutivos = 1 ponto.',
    duration: 10, sets: 3, rest: 2, players: '14',
  },
  {
    id: 'pre_08', category: 'posse',
    name: 'Posse com Setores',
    desc: 'Campo dividido em 3 zonas. Posse condicionada: pelo menos 3 passes antes de progredir. 4v4+GR em cada zona.',
    duration: 12, sets: 2, rest: 3, players: '16+2GR',
  },
  {
    id: 'pre_09', category: 'posse',
    name: 'Posse Direcional',
    desc: 'Campo 40x25m com duas mini-balizas. Marcar golo após mínimo de 5 passes. Foco na circulação para encontrar espaço.',
    duration: 10, sets: 3, rest: 2, players: '12',
  },
  {
    id: 'pre_10', category: 'posse',
    name: 'Rondo 8v3 com Transição',
    desc: 'Rondo grande. Quando perdem a bola, os 3 de fora trocam com os que erraram. Trabalho de pressing imediato.',
    duration: 8, sets: 3, rest: 1, players: '11',
  },

  // ── Finalização ──
  {
    id: 'pre_11', category: 'finalizacao',
    name: 'Finalização após Combinação',
    desc: 'Combinação de 3 jogadores na zona 14 com passe em profundidade e remate. Rotação de posições após cada repetição.',
    duration: 12, sets: 3, rest: 2, players: '6+GR',
  },
  {
    id: 'pre_12', category: 'finalizacao',
    name: '1v1 com GR',
    desc: 'Atacante parte do meio-campo, dribla cone e finaliza 1v1 com guarda-redes. Alternância de lados.',
    duration: 10, sets: 3, rest: 2, players: '4+GR',
  },
  {
    id: 'pre_13', category: 'finalizacao',
    name: 'Cruzamento e Finalização',
    desc: 'Ala cruza, avançado e médio atacam a área. Trabalho de timing, ataque ao primeiro poste e segundo poste.',
    duration: 12, sets: 3, rest: 2, players: '6+GR',
  },
  {
    id: 'pre_14', category: 'finalizacao',
    name: 'Remates de Longa Distância',
    desc: 'Estação de remates fora da área. Bola parada e em movimento. Alternância pé direito/esquerdo.',
    duration: 10, sets: 2, rest: 1, players: '4+GR',
  },
  {
    id: 'pre_15', category: 'finalizacao',
    name: 'Jogo Reduzido com Finalização',
    desc: '4v4+GR em campo reduzido (30x20m). Golo só conta se todos os jogadores da equipa estiverem no meio-campo ofensivo.',
    duration: 12, sets: 3, rest: 2, players: '8+2GR',
  },

  // ── Físico ──
  {
    id: 'pre_16', category: 'fisico',
    name: 'Circuito de Força',
    desc: 'Estações: agachamentos, burpees, pranchas, lunges, saltos. 40s trabalho / 20s pausa por estação.',
    duration: 15, sets: 3, rest: 2, players: 'Todos',
  },
  {
    id: 'pre_17', category: 'fisico',
    name: 'Sprints Repetidos (RSA)',
    desc: '6 sprints de 30m com 20s de pausa entre cada. Medir tempos. Avaliar fadiga acumulada.',
    duration: 8, sets: 2, rest: 3, players: 'Todos',
  },
  {
    id: 'pre_18', category: 'fisico',
    name: 'Resistência Intervalada',
    desc: 'Corrida em intervalos: 3 min a 80% + 1 min a trote. Monitorizar frequência cardíaca se possível.',
    duration: 20, sets: 1, rest: 0, players: 'Todos',
  },
  {
    id: 'pre_19', category: 'fisico',
    name: 'Agilidade com Escada',
    desc: 'Exercícios na escada de agilidade: pés rápidos, lateral, cruzado, icky shuffle. 3 repetições cada.',
    duration: 10, sets: 2, rest: 2, players: '4-6',
  },
  {
    id: 'pre_20', category: 'fisico',
    name: 'Potência de Salto',
    desc: 'Saltos para caixa, saltos em profundidade, saltos unipodais. 8 reps por exercício com descanso completo.',
    duration: 12, sets: 3, rest: 2, players: '4-6',
  },

  // ── Tático ──
  {
    id: 'pre_21', category: 'tatico',
    name: 'Saída de Bola (GR+4)',
    desc: 'Construção desde trás: GR + 4 defesas contra 2 pressão. Progressão para 3 e 4 em pressing. Variantes de saída.',
    duration: 15, sets: 3, rest: 2, players: '5+GR vs 4',
  },
  {
    id: 'pre_22', category: 'tatico',
    name: 'Bloco Defensivo',
    desc: 'Equipa defende em bloco baixo 4-4-2. Basculação lateral, fechar linhas, cobertura. Contra equipa com posse.',
    duration: 15, sets: 2, rest: 3, players: '11v11',
  },
  {
    id: 'pre_23', category: 'tatico',
    name: 'Transição Ofensiva',
    desc: 'Exercício de transição rápida: após recuperar bola, atacar em 6 segundos. 5v5 + 2 jokers + 2 GR.',
    duration: 12, sets: 3, rest: 2, players: '12+2GR',
  },
  {
    id: 'pre_24', category: 'tatico',
    name: 'Posicionamento Ofensivo 11v0',
    desc: 'Equipa completa sem oposição. Trabalho de posicionamento, movimentos de ruptura, linhas de passe.',
    duration: 10, sets: 2, rest: 1, players: '11',
  },
  {
    id: 'pre_25', category: 'tatico',
    name: 'Jogo Condicionado por Zonas',
    desc: 'Jogo 8v8 com campo dividido. Condicionar passes por zona (mín. 2 toques na zona defensiva, livre na ofensiva).',
    duration: 15, sets: 2, rest: 3, players: '16+2GR',
  },

  // ── Retorno à Calma ──
  {
    id: 'pre_26', category: 'retorno',
    name: 'Alongamentos Estáticos',
    desc: 'Alongamentos dos principais grupos musculares: quadríceps, isquiotibiais, adutores, gémeos, glúteos. 30s cada.',
    duration: 10, sets: 1, rest: 0, players: 'Todos',
  },
  {
    id: 'pre_27', category: 'retorno',
    name: 'Corrida Regenerativa',
    desc: 'Corrida a trote leve (40-50% FCmáx) durante 5-8 minutos. Foco na recuperação ativa.',
    duration: 7, sets: 1, rest: 0, players: 'Todos',
  },
  {
    id: 'pre_28', category: 'retorno',
    name: 'Yoga / Mobilidade Pós-Treino',
    desc: 'Sequência de posições de yoga adaptada: cat-cow, downward dog, pigeon, child pose. Respiração controlada.',
    duration: 8, sets: 1, rest: 0, players: 'Todos',
  },
  {
    id: 'pre_29', category: 'retorno',
    name: 'Foam Rolling',
    desc: 'Auto-massagem com rolo. Quadríceps, IT Band, adutores, dorsais, gémeos. 1 min por grupo muscular.',
    duration: 10, sets: 1, rest: 0, players: 'Todos',
  },
  {
    id: 'pre_30', category: 'retorno',
    name: 'Conversa Tática + Hidratação',
    desc: 'Roda de equipa: feedback do treino, pontos a melhorar, elogios. Hidratação e nutrição pós-treino.',
    duration: 5, sets: 1, rest: 0, players: 'Todos',
  },
];

// ─── API ───────────────────────────────────────────────────────────────────────

/** Return all exercises: presets + custom */
export function getAllExercises() {
  const presets = PRESET_EXERCISES.map(e => ({
    ...e,
    diagram: getExerciseDiagram(e.id, e.category)
  }));
  return [...presets, ...getCustomExercises()];
}

/** Filter exercises by category */
export function filterByCategory(category) {
  if (!category || category === 'all') return getAllExercises();
  return getAllExercises().filter(e => e.category === category);
}

/** Search exercises by name or description */
export function searchExercises(query) {
  const q = query.toLowerCase().trim();
  if (!q) return getAllExercises();
  return getAllExercises().filter(e =>
    e.name.toLowerCase().includes(q) ||
    e.desc.toLowerCase().includes(q) ||
    e.category.toLowerCase().includes(q)
  );
}

/** Create a custom exercise */
export function createExercise(data) {
  const exercise = {
    id: 'cust_' + generateId(),
    category: data.category || 'aquecimento',
    name: data.name || 'Novo Exercício',
    desc: data.desc || '',
    duration: data.duration || 10,
    sets: data.sets || 1,
    rest: data.rest || 0,
    players: data.players || '',
    diagram: data.diagram || null,
    custom: true,
  };
  saveCustomExercise(exercise);
  return exercise;
}

/** Get total duration of an exercise (including sets and rest) */
export function getExerciseTotalDuration(exercise) {
  const workTime = (exercise.duration || 0) * (exercise.sets || 1);
  const restTime = (exercise.rest || 0) * Math.max(0, (exercise.sets || 1) - 1);
  return workTime + restTime;
}

/** Clone an exercise for use in a session */
export function cloneExercise(exercise) {
  return {
    ...exercise,
    instanceId: generateId(),
  };
}

export { deleteCustomExercise, saveCustomExercise };
