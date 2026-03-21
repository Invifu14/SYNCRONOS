const COMMON_TIMEZONE_OPTIONS = [
  { value: 'America/Bogota', label: 'Colombia - America/Bogota', aliases: ['colombia', 'bogota', 'medellin', 'cali', 'barranquilla', 'cartagena', 'bucaramanga', 'cucuta', 'pasto', 'pereira', 'manizales', 'santa marta'] },
  { value: 'America/Lima', label: 'Peru - America/Lima', aliases: ['peru', 'lima', 'arequipa', 'cusco', 'trujillo', 'piura'] },
  { value: 'America/Guayaquil', label: 'Ecuador - America/Guayaquil', aliases: ['ecuador', 'quito', 'guayaquil', 'cuenca'] },
  { value: 'America/Caracas', label: 'Venezuela - America/Caracas', aliases: ['venezuela', 'caracas', 'maracaibo', 'valencia venezuela'] },
  { value: 'America/Panama', label: 'Panama - America/Panama', aliases: ['panama', 'ciudad de panama'] },
  { value: 'America/Costa_Rica', label: 'Costa Rica - America/Costa_Rica', aliases: ['costa rica', 'san jose costa rica'] },
  { value: 'America/Guatemala', label: 'Guatemala - America/Guatemala', aliases: ['guatemala', 'ciudad de guatemala'] },
  { value: 'America/El_Salvador', label: 'El Salvador - America/El_Salvador', aliases: ['el salvador', 'san salvador'] },
  { value: 'America/Tegucigalpa', label: 'Honduras - America/Tegucigalpa', aliases: ['honduras', 'tegucigalpa', 'san pedro sula'] },
  { value: 'America/Managua', label: 'Nicaragua - America/Managua', aliases: ['nicaragua', 'managua'] },
  { value: 'America/Havana', label: 'Cuba - America/Havana', aliases: ['cuba', 'la habana', 'havana'] },
  { value: 'America/Santo_Domingo', label: 'Republica Dominicana - America/Santo_Domingo', aliases: ['republica dominicana', 'santo domingo', 'dominicana'] },
  { value: 'America/Puerto_Rico', label: 'Puerto Rico - America/Puerto_Rico', aliases: ['puerto rico', 'san juan puerto rico'] },
  { value: 'America/Mexico_City', label: 'Mexico centro - America/Mexico_City', aliases: ['mexico', 'ciudad de mexico', 'cdmx', 'guadalajara', 'puebla', 'monterrey', 'oaxaca', 'merida'] },
  { value: 'America/Cancun', label: 'Mexico sureste - America/Cancun', aliases: ['cancun', 'quintana roo', 'cozumel', 'playa del carmen', 'tulum'] },
  { value: 'America/Tijuana', label: 'Mexico pacifico - America/Tijuana', aliases: ['tijuana', 'baja california', 'mexicali'] },
  { value: 'America/La_Paz', label: 'Bolivia - America/La_Paz', aliases: ['bolivia', 'la paz bolivia', 'santa cruz', 'cochabamba'] },
  { value: 'America/Santiago', label: 'Chile - America/Santiago', aliases: ['chile', 'santiago de chile', 'valparaiso', 'concepcion chile'] },
  { value: 'America/Asuncion', label: 'Paraguay - America/Asuncion', aliases: ['paraguay', 'asuncion'] },
  { value: 'America/Montevideo', label: 'Uruguay - America/Montevideo', aliases: ['uruguay', 'montevideo'] },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina - America/Argentina/Buenos_Aires', aliases: ['argentina', 'buenos aires', 'cordoba argentina', 'rosario', 'mendoza'] },
  { value: 'America/Sao_Paulo', label: 'Brasil - America/Sao_Paulo', aliases: ['brasil', 'brazil', 'sao paulo', 'rio de janeiro', 'brasilia', 'salvador de bahia', 'porto alegre'] },
  { value: 'America/New_York', label: 'Estados Unidos este - America/New_York', aliases: ['new york', 'miami', 'orlando', 'washington', 'atlanta', 'boston', 'philadelphia', 'estados unidos', 'united states usa', 'usa east'] },
  { value: 'America/Chicago', label: 'Estados Unidos centro - America/Chicago', aliases: ['chicago', 'houston', 'dallas', 'austin', 'nashville', 'new orleans', 'usa central'] },
  { value: 'America/Denver', label: 'Estados Unidos montana - America/Denver', aliases: ['denver', 'phoenix', 'salt lake city', 'albuquerque', 'usa mountain'] },
  { value: 'America/Los_Angeles', label: 'Estados Unidos pacifico - America/Los_Angeles', aliases: ['los angeles', 'san francisco', 'san diego', 'seattle', 'las vegas', 'usa west', 'california'] },
  { value: 'America/Toronto', label: 'Canada este - America/Toronto', aliases: ['canada', 'toronto', 'ottawa', 'montreal'] },
  { value: 'America/Vancouver', label: 'Canada oeste - America/Vancouver', aliases: ['vancouver', 'calgary', 'edmonton'] },
  { value: 'Europe/Madrid', label: 'Espana - Europe/Madrid', aliases: ['espana', 'madrid', 'barcelona', 'sevilla', 'valencia espana', 'bilbao'] },
  { value: 'Europe/Lisbon', label: 'Portugal - Europe/Lisbon', aliases: ['portugal', 'lisboa', 'lisbon', 'porto portugal'] },
  { value: 'Europe/London', label: 'Reino Unido - Europe/London', aliases: ['reino unido', 'united kingdom', 'uk', 'london', 'manchester'] },
  { value: 'Europe/Paris', label: 'Francia - Europe/Paris', aliases: ['francia', 'france', 'paris', 'lyon'] },
  { value: 'Europe/Rome', label: 'Italia - Europe/Rome', aliases: ['italia', 'italy', 'rome', 'roma', 'milan'] },
  { value: 'Europe/Berlin', label: 'Alemania - Europe/Berlin', aliases: ['alemania', 'germany', 'berlin', 'munich', 'frankfurt'] },
];

const normalizeLookupText = (value) => `${value || ''}`
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

export const inferTimeZoneFromLocationLabel = (label) => {
  const normalizedLabel = normalizeLookupText(label);
  if (!normalizedLabel) return '';

  let bestMatch = '';
  let bestScore = 0;

  COMMON_TIMEZONE_OPTIONS.forEach((option) => {
    option.aliases.forEach((alias) => {
      const normalizedAlias = normalizeLookupText(alias);
      if (!normalizedAlias || !normalizedLabel.includes(normalizedAlias)) return;

      if (normalizedAlias.length > bestScore) {
        bestScore = normalizedAlias.length;
        bestMatch = option.value;
      }
    });
  });

  return bestMatch;
};

export const getDefaultBirthTimeZone = () => {
  try {
    const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return deviceZone || 'America/Bogota';
  } catch (_error) {
    return 'America/Bogota';
  }
};

export const formatTimeZoneLabel = (value) => {
  if (!value) return 'Selecciona tu zona horaria de nacimiento';
  const match = COMMON_TIMEZONE_OPTIONS.find((option) => option.value === value);
  return match?.label || value;
};

export const filterTimeZones = (query) => {
  const normalizedQuery = normalizeLookupText(query);
  if (!normalizedQuery) {
    return COMMON_TIMEZONE_OPTIONS;
  }

  return COMMON_TIMEZONE_OPTIONS.filter((option) => (
    normalizeLookupText(option.label).includes(normalizedQuery)
      || normalizeLookupText(option.value).includes(normalizedQuery)
      || option.aliases.some((alias) => normalizeLookupText(alias).includes(normalizedQuery))
  ));
};

export const COMMON_BIRTH_TIMEZONES = COMMON_TIMEZONE_OPTIONS;
