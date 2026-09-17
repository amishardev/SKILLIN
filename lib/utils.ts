import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  if (hours < 10) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours)}h`;
}

export function formatWeeks(weeks: number): string {
  if (weeks === 1) return '1 week';
  if (weeks < 4) return `${weeks} weeks`;
  const months = Math.floor(weeks / 4);
  const remWeeks = weeks % 4;
  if (remWeeks === 0) return `${months} month${months > 1 ? 's' : ''}`;
  return `${months}mo ${remWeeks}w`;
}

export function getSkillLevelLabel(score: number): string {
  if (score >= 0.85) return 'Expert';
  if (score >= 0.70) return 'Advanced';
  if (score >= 0.50) return 'Intermediate';
  if (score >= 0.30) return 'Beginner';
  return 'Novice';
}

export function getSkillLevelColor(score: number): string {
  if (score >= 0.85) return '#22C55E';
  if (score >= 0.70) return '#84CC16';
  if (score >= 0.50) return '#F59E0B';
  if (score >= 0.30) return '#FF6845';
  return '#70727D';
}

export function getDifficultyLabel(difficulty: number): string {
  const labels = ['', 'Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'];
  return labels[difficulty] ?? 'Unknown';
}

export function getDifficultyColor(difficulty: number): string {
  const colors = ['', '#22C55E', '#84CC16', '#F59E0B', '#EF4444', '#9333EA'];
  return colors[difficulty] ?? '#70727D';
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '…';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
