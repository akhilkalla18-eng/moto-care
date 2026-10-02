export type JourneyStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'EMERGENCY';
export type RouteDeviationStatus = 'NORMAL' | 'WARNING' | 'CRITICAL';

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  email: string;
  phone: string;
  preferredLanguage: string;
  locationPermissionStatus: boolean;
  notificationPermissionStatus: boolean;
  createdAt: number;
}

export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  relationship: string;
  phone: string;
  priority: number;
}

export interface Journey {
  id: string;
  userId: string;
  origin: Location;
  destination: Location;
  destinationAddress?: string;
  overviewPolyline?: string;
  startTime: number;
  endTime?: number;
  status: JourneyStatus;
  currentLocation?: Location & { speed?: number; timestamp: number };
  distance?: number;
  estimatedDuration?: number;
  routeDeviationStatus: RouteDeviationStatus;
}
