/**
 * api/ai.js — Vercel Edge Function
 * Proxy seguro para a Google Gemini API.
 * A chave GEMINI_API_KEY fica nas variáveis de ambiente do Vercel.
 *
 * POST /api/ai
 * Body: { messages: [{role, content}], sessionContext: {...} }
 */

export const config = { runtime: 'edge' };

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// System prompt — contextualiza o assistente como treinador de futebol
const SYSTEM_PROMPT = `És um assistente especializado em treino de futebol integrado na aplicação "Training Lab".
O teu papel é ajudar treinadores a:
- Criar e planear sessões de treino completas
- Sugerir exercícios adequados ao objetivo tático/físico
- Explicar exercícios e metodologias de treino
- Analisar cargas de trabalho e intensidades
- Dar conselhos táticos e pedagógicos

REGRAS DE RESPOSTA:
- Responde sempre em Português de Portugal
- Sê direto e prático — o treinador está no campo ou a preparar o treino
- Quando sugerires exercícios, usa SEMPRE este formato JSON dentro da tua resposta para cada exercício:
  <exercise>{"name":"Nome do Exercício","category":"aquecimento|posse|finalizacao|fisico|tatico|retorno","duration":10,"sets":3,"rest":2,"players":"X jogadores","desc":"Descrição detalhada"}</exercise>
- Podes combinar texto explicativo com os blocos <exercise>
- Mantém os nomes e categorias em português
- Quando criares um treino completo, organiza por fases: Aquecimento → Parte Principal → Retorno à Calma

CATEGORIAS DISPONÍVEIS:
- aquecimento: Aquecimento e ativação
- posse: Posse de bola, rondos, meiinhos
- finalizacao: Finalização, remates, cruzamentos
- fisico: Condicionamento físico, sprints, força
- tatico: Tática coletiva, posicionamento, transições
- retorno: Retorno à calma, alongamentos`;

export default async function handler(req) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405, headers });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key não configurada. Adiciona GEMINI_API_KEY nas variáveis de ambiente do Vercel.' }),
      { status: 503, headers }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), { status: 400, headers });
  }

  const { messages = [], sessionContext = null } = body;

  // Build Gemini contents array
  // Gemini uses "user"/"model" roles (not "assistant")
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  // Build full system instruction (static + dynamic session context)
  let systemInstruction = SYSTEM_PROMPT;
  if (sessionContext) {
    const { sessionName, exercises = [], totalDuration } = sessionContext;
    if (sessionName) {
      systemInstruction += `\n\nCONTEXTO DA SESSÃO ATUAL:\n- Nome: ${sessionName}`;
      if (totalDuration) systemInstruction += `\n- Duração atual: ${totalDuration} min`;
      if (exercises.length > 0) {
        systemInstruction += `\n- Exercícios já na sessão:\n`;
        exercises.forEach(ex => {
          systemInstruction += `  • ${ex.name} (${ex.category}, ${ex.duration}min × ${ex.sets}séries)\n`;
        });
      }
    }
  }

  const geminiPayload = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      topP: 0.9,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  };

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini error:', geminiRes.status, errText);
      return new Response(
        JSON.stringify({ error: `Erro da API Gemini: ${geminiRes.status}` }),
        { status: 502, headers }
      );
    }

    const geminiData = await geminiRes.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return new Response(JSON.stringify({ reply: text }), { status: 200, headers });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers }
    );
  }
}
