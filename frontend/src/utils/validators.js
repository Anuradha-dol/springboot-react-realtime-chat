export const isEmail = (value) => /\S+@\S+\.\S+/.test(value);
export const minLength = (value, n) => typeof value === "string" && value.length >= n;
