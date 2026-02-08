export type CategoryId = 'education' | 'work' | 'projects' | 'extracurriculars' | 'me';

export interface ResumeItem {
  title: string;
  subtitle?: string;
  date?: string;
  details: string[];
  link?: string; // For GitHub/Project links
  iconType?: 'college' | 'company' | 'award' | 'sport' | 'linkedin' | 'email'; // To determine which "logo" to show
  image?: string; // For the profile photo
}

export interface NodeData {
  id: CategoryId;
  label: string;
  items: ResumeItem[];
}

export interface Coordinate {
  x: number;
  y: number;
}