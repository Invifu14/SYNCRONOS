export const GENDER_OPTIONS = [
  {
    value: 'Hombre',
    label: 'Hombre',
    description: 'Quieres presentarte como hombre dentro de SYNCRONOS.',
  },
  {
    value: 'Mujer',
    label: 'Mujer',
    description: 'Quieres presentarte como mujer dentro de SYNCRONOS.',
  },
  {
    value: 'Otro',
    label: 'Otro',
    description: 'Prefieres definir tu identidad de forma mas abierta y personalizada.',
  },
];

export const ORIENTATION_OPTIONS = [
  {
    value: 'Heterosexual',
    label: 'Heterosexual',
    description: 'Te identificas principalmente con atraccion hacia el genero opuesto.',
  },
  {
    value: 'Gay',
    label: 'Gay',
    description: 'Quieres describirte dentro de una atraccion romantica o sexual hacia hombres.',
  },
  {
    value: 'Lesbiana',
    label: 'Lesbiana',
    description: 'Quieres describirte dentro de una atraccion romantica o sexual hacia mujeres.',
  },
  {
    value: 'Bisexual',
    label: 'Bisexual',
    description: 'Sientes atraccion por mas de un genero.',
  },
  {
    value: 'Asexual',
    label: 'Asexual',
    description: 'Prefieres expresar una relacion con poca o nula atraccion sexual.',
  },
  {
    value: 'Demisexual',
    label: 'Demisexual',
    description: 'La atraccion sexual aparece despues de un vinculo emocional fuerte.',
  },
  {
    value: 'Pansexual',
    label: 'Pansexual',
    description: 'La atraccion no se limita al genero de la otra persona.',
  },
  {
    value: 'Queer',
    label: 'Queer',
    description: 'Prefieres una definicion amplia, flexible o fuera de etiquetas tradicionales.',
  },
  {
    value: 'En exploracion',
    label: 'En exploracion',
    description: 'Sigues descubriendo como quieres definir tu orientacion dentro de la app.',
  },
];

export const usesExpandedOrientationStep = (gender) => gender === 'Otro';
