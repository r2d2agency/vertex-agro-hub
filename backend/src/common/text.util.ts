export const onlyDigits = (v?: string | null) => (v ?? '').replace(/\D+/g, '');
