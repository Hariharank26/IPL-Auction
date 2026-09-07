import { PlayerData } from '../types/auction';

// Verified, authentic cricket player portraits and sports headshots from official Wikimedia Commons archives
const AUTHENTIC_PLAYER_PHOTOS: Record<string, string> = {
  // --- Indian Marquee / Legends ---
  'Virat Kohli':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Virat_Kohli_during_the_India_vs_Aus_4th_Test_match_at_Narendra_Modi_Stadium_on_09_March_2023.jpg/330px-Virat_Kohli_during_the_India_vs_Aus_4th_Test_match_at_Narendra_Modi_Stadium_on_09_March_2023.jpg',
  'Rohit Sharma':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Rohit_Sharma_in_PMO_New_Delhi.jpg/330px-Rohit_Sharma_in_PMO_New_Delhi.jpg',
  'MS Dhoni':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/MS_Dhoni_%28cropped%29.jpg/330px-MS_Dhoni_%28cropped%29.jpg',
  'Jasprit Bumrah':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Jasprit_Bumrah_in_PMO_New_Delhi.jpg/330px-Jasprit_Bumrah_in_PMO_New_Delhi.jpg',
  'Ravindra Jadeja':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/PM_Shri_Narendra_Modi_with_Ravindra_Jadeja_%28Cropped%29.jpg/330px-PM_Shri_Narendra_Modi_with_Ravindra_Jadeja_%28Cropped%29.jpg',
  'Hardik Pandya':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Hardik_Pandya_in_PMO_New_Delhi.jpg/330px-Hardik_Pandya_in_PMO_New_Delhi.jpg',
  'Suryakumar Yadav':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Suryakumar_Yadav_in_PMO_New_Delhi.jpg/330px-Suryakumar_Yadav_in_PMO_New_Delhi.jpg',
  'KL Rahul':
    'https://upload.wikimedia.org/wikipedia/commons/6/69/KL_Rahul_at_Femina_Miss_India_2018_Grand_Finale_%28cropped%29.jpg',
  'Rishabh Pant':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Rishabh_Pant.jpg/330px-Rishabh_Pant.jpg',
  'Mohammed Shami':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Mohammed_Shami_Arjuna_Award_%28cropped%29.jpg/330px-Mohammed_Shami_Arjuna_Award_%28cropped%29.jpg',

  // --- Indian Current Stars ---
  'Shubman Gill':
    'https://upload.wikimedia.org/wikipedia/commons/3/34/Shubman_Gill_2023_%28cropped%29.jpg',
  'Yashasvi Jaiswal':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Yashasvi_Jaiswal_in_PMO_New_Delhi.jpg/330px-Yashasvi_Jaiswal_in_PMO_New_Delhi.jpg',
  'Mohammed Siraj':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Prime_Minister_Of_Bharat_Shri_Narendra_Damodardas_Modi_with_Mohammad_Siraj_%28cropped%29.jpg/330px-Prime_Minister_Of_Bharat_Shri_Narendra_Damodardas_Modi_with_Mohammad_Siraj_%28cropped%29.jpg',
  'Kuldeep Yadav':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Kuldeep_Yadav_in_PMO_New_Delhi.jpg/330px-Kuldeep_Yadav_in_PMO_New_Delhi.jpg',
  'Axar Patel':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Axar_Patel_in_PMO_New_Delhi.jpg/330px-Axar_Patel_in_PMO_New_Delhi.jpg',
  'Ruturaj Gaikwad':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Ruturaj_Gaikwad.jpeg/330px-Ruturaj_Gaikwad.jpeg',
  'Sanju Samson':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Sanju_Samson_in_PMO_New_Delhi.jpg/330px-Sanju_Samson_in_PMO_New_Delhi.jpg',
  'Arshdeep Singh':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Prime_Minister_Of_Bharat_Shri_Narendra_Damodardas_Modi_with_Arshdeep_Singh_Family_%28Cropped%29.jpg/330px-Prime_Minister_Of_Bharat_Shri_Narendra_Damodardas_Modi_with_Arshdeep_Singh_Family_%28Cropped%29.jpg',
  'Yuzvendra Chahal':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Yuzvendra_Chahal_in_PMO_New_Delhi.jpg/330px-Yuzvendra_Chahal_in_PMO_New_Delhi.jpg',
  'Shreyas Iyer':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Shreyas_Iyer_snapped_at_the_airport_%28Cropped%29.jpg/330px-Shreyas_Iyer_snapped_at_the_airport_%28Cropped%29.jpg',
  'Ishan Kishan':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Ishan_Kishan.jpg/330px-Ishan_Kishan.jpg',
  'Washington Sundar':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Washington_Sundar.jpg/330px-Washington_Sundar.jpg',
  'Shivam Dube':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Shivam_Dube_in_PMO_New_Delhi.jpg/330px-Shivam_Dube_in_PMO_New_Delhi.jpg',
  'Khaleel Ahmed':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/2_29_Khaleel_mugshot.jpg/330px-2_29_Khaleel_mugshot.jpg',

  // --- Indian Youngsters & Emerging Stars ---
  'Tilak Varma':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Tilak_Varma_in_March_2026.png/330px-Tilak_Varma_in_March_2026.png',
  'Nitish Kumar Reddy':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Nitish_Kumar_Reddy_BGT_2024_%28cropped%29_2.jpg/330px-Nitish_Kumar_Reddy_BGT_2024_%28cropped%29_2.jpg',

  // --- Overseas Superstars ---
  'Travis Head':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Travis_Head_bowling_at_Perth_Stadium%2C_First_Test_Australia_versus_West_Indies%2C_2_December_2022_03_%28cropped%29.jpg/330px-Travis_Head_bowling_at_Perth_Stadium%2C_First_Test_Australia_versus_West_Indies%2C_2_December_2022_03_%28cropped%29.jpg',
  'Pat Cummins':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Pat_Cummins_fielding_Ashes_2021_%28cropped%29.jpg/330px-Pat_Cummins_fielding_Ashes_2021_%28cropped%29.jpg',
  'Rashid Khan':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Rashid_Khan.jpg/330px-Rashid_Khan.jpg',
  'Jos Buttler':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Jos_Buttler_in_2023.jpg/330px-Jos_Buttler_in_2023.jpg',
  'Mitchell Starc':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Mitchell_Starc_2023.jpg/330px-Mitchell_Starc_2023.jpg',
  'Sunil Narine':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Sunil_Narine.jpg/330px-Sunil_Narine.jpg',
  'Glenn Maxwell':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Glen_Maxwell_2026_%28cropped%29.jpg/330px-Glen_Maxwell_2026_%28cropped%29.jpg',
  'Trent Boult':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/2018.02.03.22.23.14-AUSvNZL_T20_AUS_innings%2C_SCG_%2839533156665%29.jpg/330px-2018.02.03.22.23.14-AUSvNZL_T20_AUS_innings%2C_SCG_%2839533156665%29.jpg',
  'Kagiso Rabada':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Kingdom_Kome_co-founders_Kagiso_Rabada_and_Cameron_Scott_at_the_first_private_screening_of_The_Ring_of_Beasts_%28cropped%29.jpg/330px-Kingdom_Kome_co-founders_Kagiso_Rabada_and_Cameron_Scott_at_the_first_private_screening_of_The_Ring_of_Beasts_%28cropped%29.jpg',
  'Phil Salt':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/2_02_Phil_Salt.jpg/330px-2_02_Phil_Salt.jpg',
  'Will Jacks':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/4_20_Will_Jacks.jpg/330px-4_20_Will_Jacks.jpg',
  'Marco Jansen':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Marco_Jansen_2022.jpg/330px-Marco_Jansen_2022.jpg',
  'Jake Fraser-McGurk':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/260328_D3_Jake_Fraser-McGurk_01.jpg/330px-260328_D3_Jake_Fraser-McGurk_01.jpg'
};

/** Get nationality theme colors for stylized jersey avatars */
function getNationalityTheme(nationality: string, isIndian: boolean) {
  if (isIndian || nationality.toLowerCase() === 'india') {
    return {
      bgPrimary: '#0f172a',
      bgSecondary: '#1e3a8a',
      accent: '#f97316', // Indian saffron
      accentSecondary: '#16a34a', // Indian green
      textColor: '#ffffff',
      flag: '🇮🇳'
    };
  }

  const nat = nationality.toLowerCase();
  if (nat.includes('australia')) {
    return {
      bgPrimary: '#022c22',
      bgSecondary: '#065f46',
      accent: '#eab308', // Australian Gold
      accentSecondary: '#10b981',
      textColor: '#ffffff',
      flag: '🇦🇺'
    };
  }
  if (nat.includes('south africa')) {
    return {
      bgPrimary: '#064e3b',
      bgSecondary: '#047857',
      accent: '#facc15', // SA Gold
      accentSecondary: '#ef4444',
      textColor: '#ffffff',
      flag: '🇿🇦'
    };
  }
  if (nat.includes('england')) {
    return {
      bgPrimary: '#0f172a',
      bgSecondary: '#1e40af',
      accent: '#ef4444', // English Red
      accentSecondary: '#3b82f6',
      textColor: '#ffffff',
      flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿'
    };
  }
  if (nat.includes('west indies')) {
    return {
      bgPrimary: '#450a0a',
      bgSecondary: '#7f1d1d',
      accent: '#eab308', // Windies Gold
      accentSecondary: '#991b1b',
      textColor: '#ffffff',
      flag: '🌴'
    };
  }
  if (nat.includes('new zealand')) {
    return {
      bgPrimary: '#09090b',
      bgSecondary: '#27272a',
      accent: '#06b6d4', // Kiwi Teal
      accentSecondary: '#e4e4e7',
      textColor: '#ffffff',
      flag: '🇳🇿'
    };
  }
  if (nat.includes('afghanistan')) {
    return {
      bgPrimary: '#172554',
      bgSecondary: '#1e3a8a',
      accent: '#dc2626', // Afghan Red
      accentSecondary: '#16a34a',
      textColor: '#ffffff',
      flag: '🇦🇫'
    };
  }
  if (nat.includes('sri lanka')) {
    return {
      bgPrimary: '#1e3a8a',
      bgSecondary: '#1d4ed8',
      accent: '#eab308', // Lankan Lion Gold
      accentSecondary: '#dc2626',
      textColor: '#ffffff',
      flag: '🇱🇰'
    };
  }

  return {
    bgPrimary: '#1e1b4b',
    bgSecondary: '#312e81',
    accent: '#8b5cf6',
    accentSecondary: '#6366f1',
    textColor: '#ffffff',
    flag: '🏏'
  };
}

/** Get short role icon emoji */
function getRoleIcon(role: string): string {
  switch (role) {
    case 'BATSMAN':
      return '🏏';
    case 'WICKETKEEPER':
      return '🧤';
    case 'FAST_BOWLER':
      return '⚡';
    case 'SPIN_BOWLER':
      return '🎯';
    case 'ALL_ROUNDER':
      return '⚔️';
    default:
      return '🏏';
  }
}

/** Generates a high-definition, SVG cricketer card avatar as a data URI */
export function generatePlayerAvatarSvg(
  playerOrName:
    | {
        name: string;
        overallRating?: number;
        nationality?: string;
        isIndian?: boolean;
        role?: string;
      }
    | string,
  optionalRole?: string
): string {
  const player =
    typeof playerOrName === 'string'
      ? { name: playerOrName, role: optionalRole || 'ALL_ROUNDER' }
      : playerOrName;

  const nationality = player.nationality || (player.isIndian ? 'India' : 'International');
  const isIndian = player.isIndian !== undefined ? player.isIndian : nationality === 'India';
  const role = (player.role || optionalRole || 'ALL_ROUNDER') as any;
  const overallRating = player.overallRating ?? 85;

  const theme = getNationalityTheme(nationality, isIndian);
  const roleIcon = getRoleIcon(role);
  
  // Extract initials
  const initials = player.name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
    <defs>
      <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${theme.bgPrimary}" />
        <stop offset="50%" stop-color="${theme.bgSecondary}" />
        <stop offset="100%" stop-color="${theme.bgPrimary}" />
      </linearGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${theme.accent}" />
        <stop offset="100%" stop-color="${theme.accentSecondary}" />
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.25" />
        <stop offset="100%" stop-color="${theme.bgPrimary}" stop-opacity="0" />
      </radialGradient>
      <pattern id="cricketStitches" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 0 10 Q 10 0 20 10 Q 10 20 0 10" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1.5"/>
      </pattern>
    </defs>
    
    <!-- Background -->
    <rect width="400" height="400" fill="url(#cardGrad)" />
    <circle cx="200" cy="180" r="180" fill="url(#glow)" />
    <rect width="400" height="400" fill="url(#cricketStitches)" />
    
    <!-- Top Sport Stripes -->
    <rect x="0" y="0" width="400" height="8" fill="url(#accentGrad)" />
    
    <!-- Outer Shield / Halo -->
    <circle cx="200" cy="170" r="115" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="3" stroke-dasharray="6,4" />
    <circle cx="200" cy="170" r="105" fill="rgba(0,0,0,0.35)" stroke="url(#accentGrad)" stroke-width="3" />

    <!-- Role Icon & Silhouette -->
    <text x="200" y="115" font-size="34" text-anchor="middle" dominant-baseline="central">${roleIcon}</text>
    
    <!-- Player Initials -->
    <text x="200" y="185" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Arial Black', sans-serif" font-weight="900" font-style="italic" font-size="64" fill="#ffffff" text-anchor="middle" dominant-baseline="central" letter-spacing="2">
      ${initials}
    </text>

    <!-- Overall Rating Badge -->
    <g transform="translate(200, 245)">
      <rect x="-42" y="-14" width="84" height="28" rx="14" fill="${theme.accent}" />
      <text x="0" y="2" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="900" font-size="14" fill="#000000" text-anchor="middle" dominant-baseline="central" letter-spacing="1">
        ${overallRating} OVR
      </text>
    </g>
    
    <!-- Bottom Banner with Name and Flag -->
    <rect x="0" y="325" width="400" height="75" fill="rgba(0,0,0,0.65)" />
    <line x1="0" y1="325" x2="400" y2="325" stroke="rgba(255,255,255,0.15)" stroke-width="1.5" />
    
    <text x="200" y="355" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="20" fill="#ffffff" text-anchor="middle" dominant-baseline="central" text-transform="uppercase" letter-spacing="0.5">
      ${player.name}
    </text>
    <text x="200" y="380" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="600" font-size="12" fill="rgba(255,255,255,0.6)" text-anchor="middle" dominant-baseline="central" letter-spacing="1">
      ${theme.flag} ${nationality.toUpperCase()} • ${role.replace('_', ' ')}
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getPlayerPhotoUrl(
  playerOrName:
    | {
        name: string;
        overallRating?: number;
        nationality?: string;
        isIndian?: boolean;
        role?: string;
      }
    | string,
  optionalRole?: string
): string {
  const name = typeof playerOrName === 'string' ? playerOrName : playerOrName?.name || '';

  // 1. Return authentic verified portrait if registered
  if (name && AUTHENTIC_PLAYER_PHOTOS[name]) {
    return AUTHENTIC_PLAYER_PHOTOS[name];
  }

  // 2. Return dedicated high-res cricketer card SVG avatar
  return generatePlayerAvatarSvg(playerOrName, optionalRole);
}

