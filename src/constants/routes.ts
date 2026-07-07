// Route name constants — không hardcode magic string trong navigation
export const ROUTES = {
  LOGIN: 'Login',
  REGISTER: 'Register',
  OTP: 'Otp',
  MAIN: 'Main',
  ACTIVE_TRIP: 'ActiveTrip',
  NOTIFICATIONS: 'Notifications',
  PROFILE: 'Profile',
  CHANGE_PASSWORD: 'ChangePassword',
  TERMS_POLICY: 'TermsPolicy',
  SUPPORT_CENTER: 'SupportCenter',
  COMPANY_INFO: 'CompanyInfo',
} as const;

// Tên các tab trong MainTabNavigator
export const TABS = {
  HOME: 'Home',
  TRIPS: 'Trips',
  EARNINGS: 'Earnings',
  ACCOUNT: 'Account',
} as const;
