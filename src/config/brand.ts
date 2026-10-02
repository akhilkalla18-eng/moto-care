export const brandConfig = {
  appName: 'Moto Care',
  shortName: 'Moto Care',
  tagline: 'Safer journeys. Greater confidence.',
  colors: {
    primary: '#1D4ED8',
    background: '#0A1128',
    emergency: '#EF4444',
    safe: '#10B981',
    warning: '#F59E0B'
  },
  thresholds: {
    ROUTE_DEVIATION_THRESHOLD_METERS: 200, // meters
    ROUTE_DEVIATION_GRACE_PERIOD_SECONDS: 60, // seconds
    STOP_DETECTION_THRESHOLD_SECONDS: 180, // seconds
    EMERGENCY_TIMEOUT_SECONDS: 30, // seconds
  }
};
