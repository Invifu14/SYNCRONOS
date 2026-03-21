export const PROFILE_PROMPT_DEFINITIONS = [
  {
    id: 'first_date',
    question: 'Una cita ideal para mi seria...',
    placeholder: 'Cafe, museo, caminar, karaoke o algo que te represente...',
    legacyQuestions: ['Mi plan ideal para una primera cita'],
  },
  {
    id: 'green_flag',
    question: 'En una relacion, algo muy mio es...',
    placeholder: 'Eso bonito que ofreces cuando conectas con alguien...',
    legacyQuestions: ['Mi green flag en el amor'],
  },
  {
    id: 'cosmic_truth',
    question: 'Un dato curioso sobre mi es...',
    placeholder: 'Algo autentico sobre tu energia, tu personalidad o tu forma de querer...',
    legacyQuestions: ['La verdad astrologica sobre mi'],
  },
];

export const normalizeProfilePrompts = (values = []) => {
  const rawItems = Array.isArray(values) ? values : [];

  return PROFILE_PROMPT_DEFINITIONS.map((definition) => {
    const existing = rawItems.find((item) => item?.id === definition.id)
      || rawItems.find((item) => item?.question === definition.question)
      || rawItems.find((item) => definition.legacyQuestions?.includes(item?.question));

    return {
      id: definition.id,
      question: definition.question,
      placeholder: definition.placeholder,
      answer: `${existing?.answer || existing?.respuesta || ''}`.trim(),
    };
  });
};

export const compactProfilePrompts = (prompts = []) => normalizeProfilePrompts(prompts)
  .map(({ id, question, answer }) => ({
    id,
    question,
    answer: `${answer || ''}`.trim(),
  }))
  .filter((prompt) => prompt.answer);
