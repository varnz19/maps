import type { CountryInfo } from '../types/tour';

const countryCache: Record<string, CountryInfo> = {};

// Hardcoded fallbacks to ensure offline compatibility for known stops
const COUNTRY_FALLBACKS: Record<string, CountryInfo> = {
  'south korea': {
    name: 'South Korea',
    languages: ['Korean'],
    currencies: ['South Korean Won (₩)'],
    flag: 'https://flagcdn.com/w320/kr.png',
  },
  'japan': {
    name: 'Japan',
    languages: ['Japanese'],
    currencies: ['Japanese Yen (¥)'],
    flag: 'https://flagcdn.com/w320/jp.png',
  },
  'united states': {
    name: 'United States',
    languages: ['English'],
    currencies: ['US Dollar ($)'],
    flag: 'https://flagcdn.com/w320/us.png',
  },
  'united kingdom': {
    name: 'United Kingdom',
    languages: ['English'],
    currencies: ['British Pound (£)'],
    flag: 'https://flagcdn.com/w320/gb.png',
  },
  'france': {
    name: 'France',
    languages: ['French'],
    currencies: ['Euro (€)'],
    flag: 'https://flagcdn.com/w320/fr.png',
  },
  'germany': {
    name: 'Germany',
    languages: ['German'],
    currencies: ['Euro (€)'],
    flag: 'https://flagcdn.com/w320/de.png',
  },
  'canada': {
    name: 'Canada',
    languages: ['English', 'French'],
    currencies: ['Canadian Dollar ($)'],
    flag: 'https://flagcdn.com/w320/ca.png',
  },
  'australia': {
    name: 'Australia',
    languages: ['English'],
    currencies: ['Australian Dollar ($)'],
    flag: 'https://flagcdn.com/w320/au.png',
  },
  'colombia': {
    name: 'Colombia',
    languages: ['Spanish'],
    currencies: ['Colombian Peso ($)'],
    flag: 'https://flagcdn.com/w320/co.png',
  },
  'peru': {
    name: 'Peru',
    languages: ['Spanish', 'Quechua', 'Aymara'],
    currencies: ['Peruvian Sol (S/.)'],
    flag: 'https://flagcdn.com/w320/pe.png',
  },
  'chile': {
    name: 'Chile',
    languages: ['Spanish'],
    currencies: ['Chilean Peso ($)'],
    flag: 'https://flagcdn.com/w320/cl.png',
  },
  'argentina': {
    name: 'Argentina',
    languages: ['Spanish'],
    currencies: ['Argentine Peso ($)'],
    flag: 'https://flagcdn.com/w320/ar.png',
  },
  'brazil': {
    name: 'Brazil',
    languages: ['Portuguese'],
    currencies: ['Brazilian Real (R$)'],
    flag: 'https://flagcdn.com/w320/br.png',
  },
  'taiwan': {
    name: 'Taiwan',
    languages: ['Mandarin Chinese'],
    currencies: ['New Taiwan Dollar (NT$)'],
    flag: 'https://flagcdn.com/w320/tw.png',
  },
  'thailand': {
    name: 'Thailand',
    languages: ['Thai'],
    currencies: ['Thai Baht (฿)'],
    flag: 'https://flagcdn.com/w320/th.png',
  },
  'malaysia': {
    name: 'Malaysia',
    languages: ['Malaysian Malay', 'English'],
    currencies: ['Malaysian Ringgit (RM)'],
    flag: 'https://flagcdn.com/w320/my.png',
  },
  'singapore': {
    name: 'Singapore',
    languages: ['English', 'Malay', 'Mandarin', 'Tamil'],
    currencies: ['Singapore Dollar ($)'],
    flag: 'https://flagcdn.com/w320/sg.png',
  },
  'indonesia': {
    name: 'Indonesia',
    languages: ['Indonesian'],
    currencies: ['Indonesian Rupiah (Rp)'],
    flag: 'https://flagcdn.com/w320/id.png',
  },
  'hong kong': {
    name: 'Hong Kong',
    languages: ['Cantonese', 'English', 'Mandarin'],
    currencies: ['Hong Kong Dollar ($)'],
    flag: 'https://flagcdn.com/w320/hk.png',
  },
  'philippines': {
    name: 'Philippines',
    languages: ['Filipino', 'English'],
    currencies: ['Philippine Peso (₱)'],
    flag: 'https://flagcdn.com/w320/ph.png',
  },
};

export async function fetchCountryDetails(countryName: string): Promise<CountryInfo> {
  const normalizedKey = countryName.toLowerCase().trim();

  // 1. Check cache
  if (countryCache[normalizedKey]) {
    return countryCache[normalizedKey];
  }

  // 2. Try fetching from REST Countries API
  try {
    const response = await fetch(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fullText=true`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch country: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      throw new Error('Country not found in response');
    }

    const country = data[0];

    // Format languages
    const languages = country.languages ? Object.values(country.languages) as string[] : ['Unknown'];

    // Format currencies
    const currencies = country.currencies
      ? Object.values(country.currencies).map((curr: any) => `${curr.name} (${curr.symbol || ''})`)
      : ['Unknown'];

    const flag = country.flags?.png || country.flags?.svg || '';

    const countryInfo: CountryInfo = {
      name: country.name?.common || countryName,
      languages,
      currencies,
      flag,
    };

    // Cache the result
    countryCache[normalizedKey] = countryInfo;
    return countryInfo;
  } catch (error) {
    console.warn(`REST Countries API failed for "${countryName}", using offline fallback:`, error);

    // 3. Fallback to hardcoded details
    if (COUNTRY_FALLBACKS[normalizedKey]) {
      return COUNTRY_FALLBACKS[normalizedKey];
    }

    // Generic fallback if not in list
    return {
      name: countryName,
      languages: ['English'],
      currencies: ['Local Currency'],
      flag: `https://placehold.co/320x200/18181b/ffffff?text=${encodeURIComponent(countryName)}`,
    };
  }
}
