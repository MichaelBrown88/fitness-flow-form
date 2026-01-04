    /**
 * Client Archetype System
 * Categorizes clients into archetypes based on their assessment scores
 */

import type { ScoreSummary } from './scoring';
import type { FormData } from '@/contexts/FormContext';

export type ClientArchetype = 
  | 'The Foundation Builder' 
  | 'The Performance Seeker'
  | 'The Metabolic Transformer'
  | 'The Movement Optimizer'
  | 'The Balanced Achiever'
  | 'The Strength Specialist'
  | 'The Cardio Champion'
  | 'The Tank'
  | 'The Juggernaut'
  | 'The Elite';

export interface ArchetypeInfo {
  name: ClientArchetype;
  description: string;
  icon: string;
  color: string;
  emblem?: string;
  quote?: string;
  level?: number;
  nextLevel?: string;
}

export function determineArchetype(scores: ScoreSummary, formData?: FormData): ArchetypeInfo {
  const bodyComp = scores.categories.find(c => c.id === 'bodyComp')?.score || 0;
  const strength = scores.categories.find(c => c.id === 'strength')?.score || 0;
  const cardio = scores.categories.find(c => c.id === 'cardio')?.score || 0;
  const movement = scores.categories.find(c => c.id === 'movementQuality')?.score || 0;
  const lifestyle = scores.categories.find(c => c.id === 'lifestyle')?.score || 0;
  
  const overall = scores.overall;
  const goals = formData?.clientGoals || [];
  const primaryGoal = goals[0] || 'general-health';
  
  // Determine archetype level based on overall score
  const getLevel = (score: number): number => {
    if (score >= 85) return 3;
    if (score >= 70) return 2;
    return 1;
  };
  
  const level = getLevel(overall);
  
  // Determine archetype based on score patterns and goals
  if (strength > 75 && movement < 60) {
    return {
      name: 'The Tank',
      description: 'You have elite horsepower (Strength), but your brakes are stuck (Mobility). Fixing your alignment is the only thing standing between you and your goal physique.',
      icon: '🏗️',
      color: 'blue',
      emblem: '🛡️',
      quote: '"Unstoppable Force, Immovable Joints."',
      level,
      nextLevel: level < 3 ? 'The Juggernaut' : undefined
    };
  }
  
  if (overall < 50) {
    return {
      name: 'The Foundation Builder',
      description: 'Building the fundamentals across all areas. Focus on establishing consistent habits and movement patterns.',
      icon: '🏗️',
      color: 'blue',
      emblem: '🔨',
      quote: '"Every Master Was Once a Beginner."',
      level,
      nextLevel: level < 3 ? 'The Balanced Achiever' : undefined
    };
  }
  
  if (movement < 60 && (bodyComp < 60 || strength < 60)) {
    return {
      name: 'The Movement Optimizer',
      description: 'Movement quality is the priority. Once structure is stable, performance will follow.',
      icon: '🎯',
      color: 'purple',
      emblem: '🎯',
      quote: '"Structure Before Strength."',
      level,
      nextLevel: level < 3 ? 'The Performance Seeker' : undefined
    };
  }
  
  if (bodyComp < 60 && (primaryGoal === 'weight-loss' || bodyComp < strength && bodyComp < cardio)) {
    return {
      name: 'The Metabolic Transformer',
      description: 'Metabolic health is the focus. Building a fat-burning engine while preserving muscle.',
      icon: '🔥',
      color: 'orange',
      emblem: '🔥',
      quote: '"Transform Your Engine, Transform Your Life."',
      level,
      nextLevel: level < 3 ? 'The Balanced Achiever' : undefined
    };
  }
  
  if (strength > 75 && (cardio < 60 || movement < 60)) {
    return {
      name: 'The Strength Specialist',
      description: 'Strong foundation in strength. Balancing with cardio and movement quality.',
      icon: '💪',
      color: 'green',
      emblem: '⚔️',
      quote: '"Power Without Balance is Fragile."',
      level,
      nextLevel: level < 3 ? 'The Balanced Achiever' : undefined
    };
  }
  
  if (cardio > 75 && (strength < 60 || movement < 60)) {
    return {
      name: 'The Cardio Champion',
      description: 'Excellent cardiovascular fitness. Building strength and movement quality.',
      icon: '🏃',
      color: 'red',
      emblem: '🏆',
      quote: '"Endurance is the Foundation of All Performance."',
      level,
      nextLevel: level < 3 ? 'The Balanced Achiever' : undefined
    };
  }
  
  if (primaryGoal === 'build-strength' || primaryGoal === 'build-muscle') {
    return {
      name: 'The Performance Seeker',
      description: 'Focused on maximizing performance. Building strength, power, and muscle.',
      icon: '⚡',
      color: 'yellow',
      emblem: '⚡',
      quote: '"Excellence is Not a Destination, It\'s a Journey."',
      level,
      nextLevel: level < 3 ? 'The Juggernaut' : undefined
    };
  }
  
  // Default: well-balanced
  return {
    name: 'The Balanced Achiever',
    description: 'Well-rounded foundation. Fine-tuning and optimization across all areas.',
    icon: '⭐',
    color: 'indigo',
    emblem: '⭐',
    quote: '"Balance is Not Something You Find, It\'s Something You Create."',
    level,
    nextLevel: level < 3 ? 'The Elite' : undefined
  };
}

