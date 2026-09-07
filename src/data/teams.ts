import { TeamConfig, TeamId } from '../types/auction';

export const TEAMS: Record<TeamId, TeamConfig> = {
  MI: {
    id: 'MI',
    name: 'Mumbai Indians',
    shortName: 'Mumbai',
    abbr: 'MI',
    primaryColor: '#004BA0',
    secondaryColor: '#D1AB3E',
    accentColor: '#3B82F6',
    logoUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=300&q=80',
    description: '5-Time IPL Champions known for power hitters and match-winning bowling.'
  },
  CSK: {
    id: 'CSK',
    name: 'Chennai Super Kings',
    shortName: 'Chennai',
    abbr: 'CSK',
    primaryColor: '#FDB913',
    secondaryColor: '#0081E5',
    accentColor: '#EAB308',
    logoUrl: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=300&q=80',
    description: 'Legendary yellow brigade with veteran composure and strategic mastery.'
  },
  RCB: {
    id: 'RCB',
    name: 'Royal Challengers Bengaluru',
    shortName: 'Bengaluru',
    abbr: 'RCB',
    primaryColor: '#D11D26',
    secondaryColor: '#000000',
    accentColor: '#EF4444',
    logoUrl: 'https://images.unsplash.com/photo-1628891890467-f7fa5932a876?auto=format&fit=crop&w=300&q=80',
    description: 'High-octane red & black franchise powered by global cricket icons.'
  },
  SRH: {
    id: 'SRH',
    name: 'Sunrisers Hyderabad',
    shortName: 'Hyderabad',
    abbr: 'SRH',
    primaryColor: '#F26522',
    secondaryColor: '#000000',
    accentColor: '#F97316',
    logoUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=300&q=80',
    description: 'Explosive openers and disciplined bowling attack from Hyderabad.'
  },
  GT: {
    id: 'GT',
    name: 'Gujarat Titans',
    shortName: 'Gujarat',
    abbr: 'GT',
    primaryColor: '#1B2133',
    secondaryColor: '#BCA06F',
    accentColor: '#38BDF8',
    logoUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=300&q=80',
    description: 'Modern dynamic champions with lethal all-rounders and tactical depth.'
  },
  KKR: {
    id: 'KKR',
    name: 'Kolkata Knight Riders',
    shortName: 'Kolkata',
    abbr: 'KKR',
    primaryColor: '#3A225D',
    secondaryColor: '#F2A900',
    accentColor: '#A855F7',
    logoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=300&q=80',
    description: 'Purple & Gold warriors famous for mystery spinners and aggressive finishers.'
  }
};

export const ALL_TEAM_IDS: TeamId[] = ['MI', 'CSK', 'RCB', 'SRH', 'GT', 'KKR'];
