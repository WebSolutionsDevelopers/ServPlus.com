export const ADMIN_EMAILS = [
  'juliano.jcavalheiro@gmail.com'
];

export const isUserAdmin = (email?: string | null): boolean => {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((adminEmail) => cleanEmail === adminEmail) || cleanEmail.includes('jcavalheiro@gmail.com');
};
